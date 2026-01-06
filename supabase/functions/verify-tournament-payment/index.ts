import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-TOURNAMENT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data } = await supabaseAuth.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { team_id, session_id } = await req.json();
    logStep("Request received", { team_id, session_id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let successfulPayment: Stripe.Checkout.Session | null = null;

    // If session_id is provided, check that specific session
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        successfulPayment = session;
        logStep("Found successful payment by session_id", { sessionId: session.id });
      }
    } else if (team_id) {
      // Fallback: Check for successful payment sessions for this team
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
      });

      successfulPayment = sessions.data.find(
        (s: Stripe.Checkout.Session) => s.metadata?.team_id === team_id && s.payment_status === "paid"
      ) || null;
      
      if (successfulPayment) {
        logStep("Found successful payment for team", { sessionId: successfulPayment.id });
      }
    }

    if (successfulPayment) {
      const metadata = successfulPayment.metadata || {};
      let finalTeamId = metadata.team_id;

      // If this was a new team creation payment, create the team now
      if (metadata.create_new_team === "true" && metadata.team_name) {
        logStep("Creating new team after successful payment", { team_name: metadata.team_name });
        
        // Check if team was already created for this session
        const { data: existingTeam } = await supabaseClient
          .from("teams")
          .select("id")
          .eq("owner_id", metadata.user_id)
          .eq("name", metadata.team_name)
          .maybeSingle();

        if (existingTeam) {
          finalTeamId = existingTeam.id;
          logStep("Team already exists", { teamId: finalTeamId });
        } else {
          // Create the team
          const { data: newTeam, error: createError } = await supabaseClient
            .from("teams")
            .insert({
              name: metadata.team_name,
              owner_id: metadata.user_id,
              is_paid: true,
              paid_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            logStep("Error creating team", { error: createError.message });
            throw createError;
          }

          finalTeamId = newTeam.id;
          logStep("Team created", { teamId: finalTeamId });
        }
      } else if (finalTeamId) {
        // Update existing team's is_paid status
        const { error: updateError } = await supabaseClient
          .from("teams")
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq("id", finalTeamId);

        if (updateError) {
          logStep("Error updating team", { error: updateError.message });
          throw updateError;
        }
        logStep("Team updated to paid");
      }

      return new Response(JSON.stringify({ paid: true, team_id: finalTeamId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("No successful payment found");
    return new Response(JSON.stringify({ paid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
