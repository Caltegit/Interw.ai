# Plan — Étoile de clonage automatique sur les sessions types

## Objectif
Permettre au super-admin de marquer n'importe quelle **session type** (depuis Ressources › Sessions) avec une étoile. À la création d'une nouvelle organisation, **toutes** les sessions types étoilées sont automatiquement clonées en tant que **projets actifs** dans la nouvelle orga. Cette logique remplace l'actuel clonage d'un projet "modèle" en dur (id `3519629b-...`).

## 1. Base de données (migration)

### 1.1 Nouveau drapeau sur `interview_templates`
- Ajouter la colonne `clone_to_new_orgs BOOLEAN NOT NULL DEFAULT FALSE`.
- Index partiel sur `WHERE clone_to_new_orgs = TRUE` pour itération rapide au seed.
- RLS : seuls les super-admins peuvent passer ce flag à `TRUE`/`FALSE` (policy `UPDATE` dédiée vérifiant `public.is_super_admin(auth.uid())`). La lecture reste inchangée.

### 1.2 Nouvelle fonction `seed_starred_templates_into_org(_org_id, _created_by)`
- `SECURITY DEFINER`, `search_path = public`.
- Boucle sur **toutes** les `interview_templates` (toutes orgs confondues) où `clone_to_new_orgs = TRUE`.
- Pour chacune : crée une ligne dans `public.projects` à partir des champs partagés (titre = nom du template, job_title, durée, langue, voix, intro, ai_*, record_*, etc.), `status = 'active'`, `organization_id = _org_id`, `created_by = _created_by`, slug unique.
- Copie ensuite les `interview_template_questions` → `questions` (avec remap `project_id`).
- Copie les `interview_template_criteria` → `evaluation_criteria` (avec remap).
- Pas de doublon : skip si un projet du même titre existe déjà dans l'orga (même garde que `clone_template_project_into_org`).

### 1.3 Mise à jour du trigger `trg_seed_on_owner_set`
- Remplacer l'appel `PERFORM public.clone_template_project_into_org(...)` par `PERFORM public.seed_starred_templates_into_org(NEW.id, NEW.owner_id)`.
- Garder les 3 autres `seed_default_*` (questions, critères, sessions types) inchangés.
- L'ancienne fonction `clone_template_project_into_org` est conservée (non appelée) pour ne rien casser sur d'éventuels scripts externes.

## 2. Frontend — `src/pages/InterviewTemplates.tsx`

- Importer `useSuperAdmin`.
- Étendre l'interface `InterviewTemplate` avec `clone_to_new_orgs: boolean` et l'inclure dans le `select`.
- Ajouter sur chaque `<Card>` (uniquement si `isSuperAdmin`) un bouton **étoile** positionné en haut à droite de la carte (`absolute top-2 right-2`, `Card` passé en `relative`).
  - Icône `Star` de `lucide-react`.
  - État "allumé" : `fill-current text-yellow-500`.
  - État éteint : `text-muted-foreground`.
  - Tooltip : "Cloner automatiquement dans toutes les nouvelles organisations".
- Au clic : `update` sur `interview_templates` du flag, mise à jour optimiste, toast de confirmation, recharge.

## 3. Modal de création d'orga — `CreateOrgDialog.tsx`
- Conserver le switch "Charger les ressources par défaut" (il pilote toujours questions/critères/intros/sessions types par défaut).
- Aucune autre case à cocher : le clonage des projets est désormais entièrement piloté par les étoiles.

## 4. Hors-scope
- Aucune modification des autres pages Ressources.
- Aucune modification des organisations existantes (le clonage n'a lieu qu'à la création).
- Pas de modification du fichier `superadmin-create-org/index.ts` (le trigger fait déjà le travail).

## Détails techniques

### Schéma de la migration (résumé)
```sql
ALTER TABLE public.interview_templates
  ADD COLUMN clone_to_new_orgs boolean NOT NULL DEFAULT false;

CREATE INDEX idx_interview_templates_starred
  ON public.interview_templates (clone_to_new_orgs)
  WHERE clone_to_new_orgs = true;

CREATE POLICY "Super admin can toggle clone flag"
  ON public.interview_templates FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
-- (la policy d'update normale reste pour les autres champs via org membership)
```
Note : si la policy `UPDATE` existante autorise déjà la modif au sein de l'orga, la nouvelle policy s'ajoute (OR logique). À vérifier au moment de l'écriture.

### Fonction de clonage (squelette)
```sql
CREATE OR REPLACE FUNCTION public.seed_starred_templates_into_org(
  _org_id uuid, _created_by uuid
) RETURNS void ...
DECLARE _tpl RECORD; _new_project_id uuid; _crit_map jsonb;
BEGIN
  FOR _tpl IN
    SELECT * FROM public.interview_templates WHERE clone_to_new_orgs = true
  LOOP
    -- skip si projet du même titre existe déjà
    -- insert into projects (...) RETURNING id INTO _new_project_id;
    -- copy criteria (map old_id -> new_id dans _crit_map)
    -- copy questions
  END LOOP;
END $$;
```
