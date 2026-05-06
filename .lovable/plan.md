# Bug : clement.g ne voit pas les rapports des projets créés par d'autres membres de son org

## Diagnostic

Sur le compte ALBO (org `d51d6ce0…`), l'utilisateur `clement.g@alboteam.com` ne voit **aucun rapport** pour les sessions des projets qu'il n'a pas créés lui-même — par exemple le projet « Candidature spontanée » (créé par `benjamin@alboteam.com`).

Vérifié en base :
- La session `1333aea3…` est bien `completed`, le rapport `147120cb…` a bien été généré à 10:00:56, le transcript et les messages existent.
- Donc le pipeline `finalize-session → transcribe-session → generate-report` fonctionne. **Le rapport existe, il est juste invisible côté UI.**

Cause racine : les policies RLS SELECT de plusieurs tables ne regardent que `projects.created_by = auth.uid()` au lieu de l'appartenance à l'organisation. Concrètement :

| Table | Policy SELECT actuelle |
|---|---|
| `reports` | `Users can view own reports` → `p.created_by = auth.uid()` uniquement |
| `transcripts` | `Users can view own transcripts` → idem |
| `session_messages` | `Users can view own session messages` → idem |

Les autres tables liées (`sessions`, `projects`, `questions`, `evaluation_criteria`) acceptent déjà l'org et `is_super_admin`. Seules ces 3 tables sont restées en mode « propriétaire seul », ce qui casse le partage intra-org dès qu'un projet est créé par un collègue.

## Correctif

Migration SQL pour aligner les 3 policies sur le même modèle que `sessions` / `projects` :

```sql
-- reports
DROP POLICY "Users can view own reports" ON public.reports;
CREATE POLICY "Org members can view reports"
ON public.reports FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = reports.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = get_user_organization_id(auth.uid())
         OR is_super_admin(auth.uid()))
));

-- même chose pour UPDATE de reports (recruiter_notes, decision…)
DROP POLICY "Users can update own reports" ON public.reports;
CREATE POLICY "Org members can update reports"
ON public.reports FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = reports.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = get_user_organization_id(auth.uid())
         OR is_super_admin(auth.uid()))
));

-- transcripts
DROP POLICY "Users can view own transcripts" ON public.transcripts;
CREATE POLICY "Org members can view transcripts"
ON public.transcripts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = transcripts.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = get_user_organization_id(auth.uid())
         OR is_super_admin(auth.uid()))
));

-- session_messages
DROP POLICY "Users can view own session messages" ON public.session_messages;
CREATE POLICY "Org members can view session messages"
ON public.session_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = session_messages.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = get_user_organization_id(auth.uid())
         OR is_super_admin(auth.uid()))
));
```

## Effet attendu

- Clément voit immédiatement tous les rapports, transcripts et messages des sessions de son org ALBO, y compris ceux des projets créés par Benjamin ou Damien.
- Aucun changement de code applicatif nécessaire.
- Sécurité préservée : on reste sur le même modèle org-scoped que `sessions` / `projects`.

## Hors scope

- L'erreur `duplicate key` 23505 vue dans les logs `generate-report` (session `f6917691`) est sans impact : c'est un double-déclenchement (trigger + cleanup) bloqué par la contrainte unique. À traiter séparément en idempotence si on veut nettoyer les logs.
