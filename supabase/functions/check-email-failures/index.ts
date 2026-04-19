import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Auth: service_role OR super_admin (for manual trigger from UI)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const token = authHeader.slice('Bearer '.length).trim()
  const claims = parseJwtClaims(token)
  const isServiceRole = claims?.role === 'service_role'

  const supabase = createClient(supabaseUrl, serviceKey)

  if (!isServiceRole) {
    // Verify super_admin via JWT sub
    const userId = claims?.sub as string | undefined
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: isAdmin } = await supabase.rpc('is_super_admin', { _user_id: userId })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // 1. Read config
  const { data: config } = await supabase
    .from('email_alert_config')
    .select('failure_threshold, window_minutes, cooldown_hours, enabled')
    .eq('id', 1)
    .single()

  if (!config?.enabled) {
    return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const threshold = config.failure_threshold
  const windowMinutes = config.window_minutes
  const cooldownHours = config.cooldown_hours

  // 2. Cooldown check
  const cooldownSince = new Date(Date.now() - cooldownHours * 3600 * 1000).toISOString()
  const { data: recentAlert } = await supabase
    .from('email_alert_log')
    .select('id, triggered_at')
    .gte('triggered_at', cooldownSince)
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentAlert) {
    return new Response(JSON.stringify({ skipped: true, reason: 'cooldown', last_alert: recentAlert.triggered_at }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Count failures in window (dedup by message_id)
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  const { data: failedRows, error: failErr } = await supabase
    .from('email_send_log')
    .select('message_id, status, recipient_email, template_name, created_at')
    .gte('created_at', since)
    .in('status', ['failed', 'dlq'])
    .limit(2000)

  if (failErr) {
    return new Response(JSON.stringify({ error: failErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Dedup by message_id (keep worst status: dlq > failed)
  const byMsg = new Map<string, any>()
  for (const r of failedRows ?? []) {
    if (!r.message_id) continue
    const prev = byMsg.get(r.message_id)
    if (!prev || (r.status === 'dlq' && prev.status === 'failed')) {
      byMsg.set(r.message_id, r)
    }
  }

  // Exclude messages that eventually succeeded
  const messageIds = Array.from(byMsg.keys())
  if (messageIds.length > 0) {
    const { data: sentRows } = await supabase
      .from('email_send_log')
      .select('message_id')
      .in('message_id', messageIds)
      .eq('status', 'sent')
    for (const r of sentRows ?? []) {
      if (r.message_id) byMsg.delete(r.message_id)
    }
  }

  const failureCount = byMsg.size

  if (failureCount < threshold) {
    return new Response(JSON.stringify({ ok: true, failureCount, threshold, alerted: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 4. Find super_admin recipients
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'super_admin')

  const adminIds = (admins ?? []).map((a) => a.user_id)
  if (adminIds.length === 0) {
    await supabase.from('email_alert_log').insert({
      failure_count: failureCount, threshold, window_minutes: windowMinutes,
      recipients_notified: 0, details: { reason: 'no_super_admin' },
    })
    return new Response(JSON.stringify({ ok: true, failureCount, alerted: false, reason: 'no_super_admin' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, email')
    .in('user_id', adminIds)

  const recipients = (profiles ?? []).filter((p) => p.email).map((p) => p.email)

  // 5. Send alert via send-transactional-email
  const alertId = crypto.randomUUID()
  let notified = 0
  for (const email of recipients) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName: 'email-failure-alert',
          recipientEmail: email,
          idempotencyKey: `email-alert-${alertId}-${email}`,
          templateData: {
            failureCount,
            threshold,
            windowMinutes,
            dashboardUrl: 'https://interw.ai/admin/emails',
          },
        }),
      })
      if (resp.ok) notified++
      else console.error('alert send failed', email, resp.status, await resp.text())
    } catch (e) {
      console.error('alert send error', email, e)
    }
  }

  // 6. Log alert
  await supabase.from('email_alert_log').insert({
    failure_count: failureCount, threshold, window_minutes: windowMinutes,
    recipients_notified: notified,
    details: { recipients, sample: Array.from(byMsg.values()).slice(0, 10) },
  })

  return new Response(JSON.stringify({
    ok: true, failureCount, threshold, alerted: true, notified, recipients: recipients.length,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
