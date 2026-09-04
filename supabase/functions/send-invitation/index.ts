import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.102.1/cors";
import { sendAppEmail } from "../_shared/transactional-email-templates/send-app-email.ts";

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

    // Get organization name
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

    // Build the applicative invitation link (opens InviteSignup page).
    // We deliberately do NOT use supabase.auth.admin.inviteUserByEmail because
    // it creates the auth user immediately and lets the invitee sign in without
    // setting a password. Here the user only exists after they submit the
    // signup form on /invite/{token}.
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://interw.com";
    const inviteLink = `${origin}/invite/${invitationToken}`;

    // Send invitation email via our transactional email function
    let sendError: unknown = null;
    try {
      await sendAppEmail("organization-invite", email, {
        templateData: {
          inviterName,
          organizationName: orgName,
          inviteUrl: inviteLink,
          recipientEmail: email,
        },
      });
    } catch (e) {
      sendError = e;
    }

    if (sendError) {
      console.error("send-invitation: email dispatch failed", sendError);
      return new Response(JSON.stringify({
        error: "L'invitation a été créée mais l'email n'a pas pu être envoyé.",
        inviteLink,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      inviteLink,
      message: `Invitation envoyée à ${email}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
