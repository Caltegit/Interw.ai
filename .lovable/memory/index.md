# Memory: index.md
Updated: now

# Project Memory

## Core
InterviewAI: SaaS plateforme d'entretien vidéo IA pour recrutement. Primary #6366F1 (indigo), Inter font.
Lovable Cloud backend with RLS. Roles in separate user_roles table with has_role() SECURITY DEFINER.
Tables: organizations, profiles, user_roles, projects, questions, evaluation_criteria, sessions, session_messages, transcripts, reports, question_templates, criteria_templates, intro_templates.
French UI. Candidate routes are public (no auth). RH routes are protected.

## Memories
- [Database schema](mem://features/database-schema) — All tables, enums, RLS policies, storage bucket
- [Design system](mem://design/theme) — Indigo primary, success/warning/danger tokens, Inter font
- [Routes](mem://features/routes) — Public candidate routes, protected RH routes with sidebar layout
