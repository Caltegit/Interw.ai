import { createClient } from 'npm:@supabase/supabase-js@2'
import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Check caller is super_admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: userData.user.id })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let messageId: string
  try {
    const body = await req.json()
    messageId = body.message_id
    if (!messageId) throw new Error('missing')
  } catch {
    return new Response(JSON.stringify({ error: 'message_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fetch original log entry
  const { data: log, error: logErr } = await supabase
    .from('email_send_log')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (logErr || !log) {
    return new Response(JSON.stringify({ error: 'Email not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Renvoi manuel : le contenu original n'est pas régénérable, on renvoie un
  // message de notification à la même adresse.
  const newMessageId = crypto.randomUUID()
  const html =
    '<p>Cet email a été renvoyé manuellement par un administrateur. Le contenu original n\'a pas pu être régénéré automatiquement — contactez l\'équipe pour les détails complets.</p>'
  const text = 'Cet email a été renvoyé manuellement par un administrateur.'

  try {
    await sendLovableEmail(
      {
        to: log.recipient_email,
        from: 'Interw <hello@notify.interw.com>',
        sender_domain: 'notify.interw.com',
        subject: '[Renvoi] ' + (log.template_name || 'Email'),
        html,
        text,
        purpose: 'transactional',
        label: log.template_name + '-retry',
        idempotency_key: newMessageId,
      },
      { apiKey: Deno.env.get('LOVABLE_API_KEY')!, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (e) {
    const suppressed = e instanceof EmailAPIError && e.code === 'recipient_suppressed'
    await supabase.from('email_send_log').insert({
      message_id: newMessageId,
      template_name: log.template_name + '-retry',
      recipient_email: log.recipient_email,
      status: suppressed ? 'suppressed' : 'failed',
      error_message: suppressed ? null : (e instanceof Error ? e.message : String(e)).slice(0, 1000),
      metadata: { retried_from: messageId, retried_by: userData.user.id },
    })
    if (suppressed) {
      return new Response(
        JSON.stringify({ success: false, reason: 'recipient_suppressed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({ error: 'Failed to send', detail: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  await supabase.from('email_send_log').insert({
    message_id: newMessageId,
    template_name: log.template_name + '-retry',
    recipient_email: log.recipient_email,
    status: 'sent',
    metadata: { retried_from: messageId, retried_by: userData.user.id },
  })

  return new Response(JSON.stringify({ success: true, new_message_id: newMessageId }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
