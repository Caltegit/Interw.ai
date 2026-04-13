import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.102.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, organizationId, invitationToken } = await req.json();

    if (!email || !organizationId || !invitationToken) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organization name for the email
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    // Get caller name
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", caller.id)
      .single();

    const orgName = org?.name || "votre organisation";
    const inviterName = callerProfile?.full_name || "Un recruteur";

    // Determine the app URL from the request origin or referer
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || supabaseUrl;
    const inviteLink = `${origin}/invite/${invitationToken}`;

    // Send invite email using Supabase Auth admin
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        invitation_token: invitationToken,
        organization_id: organizationId,
      },
    });

    if (inviteError) {
      // If user already exists, just return success - they can use the link
      if (inviteError.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ 
          success: true, 
          inviteLink,
          message: "Cet utilisateur existe déjà. Partagez-lui le lien d'invitation." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw inviteError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      inviteLink,
      message: `Invitation envoyée à ${email}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
