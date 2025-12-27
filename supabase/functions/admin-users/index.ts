import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create regular client to check caller's permissions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is owner or admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    const body = await req.json();
    const { action, userId, email, password, displayName, reason, banUntil } = body;

    switch (action) {
      case "list_users": {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        
        // Get bans for all users
        const { data: bansData } = await supabaseAdmin
          .from("user_bans")
          .select("*")
          .gt("banned_until", new Date().toISOString());
        
        const bansMap = new Map((bansData || []).map((b: any) => [b.user_id, b]));
        
        return new Response(
          JSON.stringify({ users: users.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            email_confirmed_at: u.email_confirmed_at,
            ban: bansMap.get(u.id) || null,
          })) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_password": {
        if (!userId || !password) {
          throw new Error("Missing userId or password");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: password
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Password updated" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_email": {
        if (!userId || !email) {
          throw new Error("Missing userId or email");
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: email,
          email_confirm: true
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "Email updated" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        if (!userId) {
          throw new Error("Missing userId");
        }

        if (userId === user.id) {
          throw new Error("Cannot delete your own account");
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "User deleted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_user": {
        if (!email || !password) {
          throw new Error("Missing email or password");
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { display_name: displayName || email.split('@')[0] }
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, user: data.user }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "ban_user": {
        if (!userId || !banUntil) {
          throw new Error("Missing userId or banUntil");
        }

        if (userId === user.id) {
          throw new Error("Cannot ban yourself");
        }

        // Insert ban record
        const { error } = await supabaseAdmin.from("user_bans").insert({
          user_id: userId,
          banned_by: user.id,
          reason: reason || null,
          banned_until: banUntil,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "User banned" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unban_user": {
        if (!userId) {
          throw new Error("Missing userId");
        }

        // Delete active bans
        const { error } = await supabaseAdmin
          .from("user_bans")
          .delete()
          .eq("user_id", userId)
          .gt("banned_until", new Date().toISOString());

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: "User unbanned" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error: any) {
    console.error("Admin users error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
