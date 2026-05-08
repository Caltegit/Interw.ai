import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().min(5).max(2000),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const { sessionId, message } = parsed.data

    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select('id, candidate_name, candidate_email, project_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (sErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, title, job_title')
      .eq('id', session.project_id)
      .maybeSingle()

    const { data: superAdmin } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin')
      .limit(1)
      .maybeSingle()

    if (!superAdmin?.user_id) {
      console.error('No super admin found for feedback thread')
      return new Response(JSON.stringify({ error: 'No super admin available' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const candidateName = session.candidate_name || 'Candidat'
    const jobTitle = project?.job_title || ''
    const projectTitle = project?.title || ''

    const subject = jobTitle
      ? `Signalement candidat — ${candidateName} (${jobTitle})`
      : `Signalement candidat — ${candidateName}`

    const { data: thread, error: tErr } = await supabase
      .from('feedback_threads')
      .insert({
        user_id: superAdmin.user_id,
        subject,
        status: 'open',
      })
      .select('id')
      .single()

    if (tErr || !thread) {
      console.error('Failed to create feedback thread', tErr)
      return new Response(JSON.stringify({ error: 'Failed to create feedback thread' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const content = [
      'Signalement reçu pendant l\'entretien.',
      '',
      `Candidat : ${candidateName}${session.candidate_email ? ` (${session.candidate_email})` : ''}`,
      jobTitle || projectTitle ? `Poste : ${jobTitle}${projectTitle ? ` — ${projectTitle}` : ''}` : null,
      `Session : https://interw.ai/sessions/${session.id}`,
      '',
      'Message du candidat :',
      message,
    ].filter(Boolean).join('\n')

    const { error: mErr } = await supabase.from('feedback_messages').insert({
      thread_id: thread.id,
      author_id: superAdmin.user_id,
      author_role: 'user',
      content,
    })

    if (mErr) {
      console.error('Failed to create feedback message', mErr)
      return new Response(JSON.stringify({ error: 'Failed to create feedback message' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, threadId: thread.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('report-interview-issue error', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
