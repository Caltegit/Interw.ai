import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { TEMPLATES as TX_TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'interw'
const SITE_URL = 'https://interw.ai'
const SAMPLE_URL = 'https://interw.ai/sample'
const SAMPLE_EMAIL = 'candidat@example.com'

const AUTH_TEMPLATES: Record<string, { component: any; subject: string; sampleProps: Record<string, any>; variables: string[]; displayName: string; group: 'auth' }> = {
  signup: {
    component: SignupEmail,
    subject: 'Confirmez votre email',
    displayName: 'Inscription',
    sampleProps: { siteName: SITE_NAME, siteUrl: SITE_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_URL },
    variables: ['siteName', 'siteUrl', 'recipient', 'confirmationUrl'],
    group: 'auth',
  },
  recovery: {
    component: RecoveryEmail,
    subject: 'Réinitialisez votre mot de passe',
    displayName: 'Mot de passe oublié',
    sampleProps: { siteName: SITE_NAME, confirmationUrl: SAMPLE_URL },
    variables: ['siteName', 'confirmationUrl'],
    group: 'auth',
  },
  invite: {
    component: InviteEmail,
    subject: 'Vous êtes invité',
    displayName: 'Invitation',
    sampleProps: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: SAMPLE_URL },
    variables: ['siteName', 'siteUrl', 'confirmationUrl'],
    group: 'auth',
  },
  magiclink: {
    component: MagicLinkEmail,
    subject: 'Votre lien de connexion',
    displayName: 'Lien magique',
    sampleProps: { siteName: SITE_NAME, confirmationUrl: SAMPLE_URL },
    variables: ['siteName', 'confirmationUrl'],
    group: 'auth',
  },
  email_change: {
    component: EmailChangeEmail,
    subject: 'Confirmez votre nouvel email',
    displayName: 'Changement d\'email',
    sampleProps: { siteName: SITE_NAME, email: SAMPLE_EMAIL, newEmail: 'nouveau@example.com', confirmationUrl: SAMPLE_URL },
    variables: ['siteName', 'email', 'newEmail', 'confirmationUrl'],
    group: 'auth',
  },
  reauthentication: {
    component: ReauthenticationEmail,
    subject: 'Votre code de vérification',
    displayName: 'Réauthentification',
    sampleProps: { token: '123456' },
    variables: ['token'],
    group: 'auth',
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Validate JWT in code (verify_jwt = false in config to support ES256 signing keys)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const token = authHeader.replace('Bearer ', '')
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token)
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    // Build list
    const items: any[] = []

    for (const [key, tpl] of Object.entries(AUTH_TEMPLATES)) {
      const html = await renderAsync(React.createElement(tpl.component, tpl.sampleProps))
      items.push({
        key,
        group: 'auth',
        displayName: tpl.displayName,
        subject: tpl.subject,
        html,
        variables: tpl.variables,
        sampleProps: tpl.sampleProps,
      })
    }

    for (const [key, tpl] of Object.entries(TX_TEMPLATES)) {
      const sampleProps = tpl.previewData || {}
      const html = await renderAsync(React.createElement(tpl.component, sampleProps))
      const subject = typeof tpl.subject === 'function' ? tpl.subject(sampleProps) : tpl.subject
      items.push({
        key,
        group: 'transactional',
        displayName: tpl.displayName || key,
        subject,
        html,
        variables: Object.keys(sampleProps),
        sampleProps,
      })
    }

    return new Response(JSON.stringify({ templates: items }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('get-email-template-defaults error', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
