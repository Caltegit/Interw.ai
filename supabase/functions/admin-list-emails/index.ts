import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) {
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

  let body: any = {}
  try { body = await req.json() } catch { }
  const since = body.since || new Date(Date.now() - 7 * 86400000).toISOString()
  const until = body.until || new Date().toISOString()
  const template = body.template || null
  const status = body.status || null
  const search = body.search || null
  const page = Math.max(0, Number(body.page) || 0)
  const pageSize = 50

  const { data: rows, error } = await supabase
    .from('email_send_log')
    .select('*')
    .gte('created_at', since)
    .lte('created_at', until)
    .not('message_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const seen = new Set<string>()
  const dedup: any[] = []
  for (const r of rows || []) {
    if (seen.has(r.message_id)) continue
    seen.add(r.message_id)
    dedup.push(r)
  }

  let filtered = dedup
  if (template) filtered = filtered.filter((r) => r.template_name === template)
  if (status) filtered = filtered.filter((r) => r.status === status)
  if (search) {
    const q = String(search).toLowerCase()
    filtered = filtered.filter((r) => (r.recipient_email || '').toLowerCase().includes(q))
  }

  let statsBase = dedup
  if (template) statsBase = statsBase.filter((r) => r.template_name === template)
  if (search) {
    const q = String(search).toLowerCase()
    statsBase = statsBase.filter((r) => (r.recipient_email || '').toLowerCase().includes(q))
  }
  const stats = {
    total: statsBase.length,
    sent: statsBase.filter((r) => r.status === 'sent').length,
    pending: statsBase.filter((r) => r.status === 'pending').length,
    failed: statsBase.filter((r) => r.status === 'failed' || r.status === 'dlq').length,
    suppressed: statsBase.filter((r) => r.status === 'suppressed').length,
  }

  const templates = Array.from(new Set(dedup.map((r) => r.template_name).filter(Boolean))).sort()

  const total = filtered.length
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)

  return new Response(
    JSON.stringify({ rows: paged, stats, templates, total, page, pageSize }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
