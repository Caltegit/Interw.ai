create or replace view public.mcp_candidats
with (security_invoker = on) as
select
  s.id,
  s.project_id,
  s.candidate_name,
  s.candidate_email,
  s.status,
  s.started_at,
  s.completed_at,
  s.duration_seconds,
  s.recruiter_decision,
  s.created_at,
  s.organization_id,
  r.id as report_id,
  r.overall_score,
  r.overall_grade,
  r.recommendation,
  r.criteria_scores
from public.sessions s
left join public.reports r on r.session_id = s.id
where s.is_demo = false;

grant select on public.mcp_candidats to authenticated;
grant select on public.mcp_candidats to service_role;