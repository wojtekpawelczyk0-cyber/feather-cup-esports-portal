import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find matches starting in the next 30 minutes that have commentators
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(name),
        team2:teams!matches_team2_id_fkey(name)
      `)
      .eq("status", "scheduled")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", in30Minutes.toISOString());

    if (matchesError) throw matchesError;

    console.log(`Found ${matches?.length || 0} matches starting soon`);

    const notifications: { email: string; match: any }[] = [];

    for (const match of matches || []) {
      const commentatorIds = [match.commentator1_id, match.commentator2_id].filter(Boolean);
      
      if (commentatorIds.length === 0) continue;

      // Get commentator profiles and their emails
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", commentatorIds);

      // Get emails from auth.users
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const userEmailMap = new Map(users.map(u => [u.id, u.email]));

      for (const profile of profiles || []) {
        const email = userEmailMap.get(profile.user_id);
        if (email) {
          notifications.push({ email, match });
        }
      }
    }

    console.log(`Sending ${notifications.length} notifications`);

    // Send emails
    for (const { email, match } of notifications) {
      const matchTime = new Date(match.scheduled_at).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const team1Name = match.team1?.name || "TBD";
      const team2Name = match.team2?.name || "TBD";

      try {
        await resend.emails.send({
          from: "Feather Cup <onboarding@resend.dev>",
          to: [email],
          subject: `⏰ Przypomnienie: Mecz ${team1Name} vs ${team2Name} za 30 minut!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #8B5CF6;">🎙️ Przypomnienie o meczu</h1>
              <p>Cześć!</p>
              <p>Przypominamy, że za <strong>30 minut</strong> rozpoczyna się mecz, który komentujesz:</p>
              <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h2 style="color: #fff; margin: 0; text-align: center;">
                  ${team1Name} <span style="color: #8B5CF6;">vs</span> ${team2Name}
                </h2>
                <p style="color: #aaa; text-align: center; margin: 10px 0 0 0;">
                  📅 ${matchTime}
                </p>
              </div>
              <p>Przygotuj się i bądź gotowy na czas!</p>
              <p style="color: #888;">Pozdrawiamy,<br>Zespół Feather Cup</p>
            </div>
          `,
        });
        console.log(`Email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
