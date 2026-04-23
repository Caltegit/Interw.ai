-- 1) Ajouter la colonne archived_at sur questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_questions_project_active
  ON public.questions (project_id)
  WHERE archived_at IS NULL;

-- 2) Nettoyer les doublons existants
-- Pour chaque (project_id, order_index), garder la question la plus récente
-- (sur created_at), archiver/supprimer les anciennes.
WITH ranked AS (
  SELECT
    id,
    project_id,
    order_index,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, order_index
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.questions
  WHERE archived_at IS NULL
),
to_remove AS (
  SELECT id FROM ranked WHERE rn > 1
),
referenced AS (
  SELECT DISTINCT q.id
  FROM to_remove q
  JOIN public.session_messages sm ON sm.question_id = q.id
)
-- Archiver les anciennes versions qui sont référencées
UPDATE public.questions
SET archived_at = now()
WHERE id IN (SELECT id FROM referenced);

-- Supprimer les anciennes versions non référencées
WITH ranked AS (
  SELECT
    id,
    project_id,
    order_index,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, order_index
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.questions
  WHERE archived_at IS NULL
)
DELETE FROM public.questions q
USING ranked r
WHERE q.id = r.id
  AND r.rn > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.session_messages sm WHERE sm.question_id = q.id
  );