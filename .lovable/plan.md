# Rattraper l'attitude vidéo + activer la captation par défaut

## Objectif

1. Rattraper les rapports où l'attitude est `skipped: video_not_recorded` alors que des segments vidéo existent réellement.
2. Activer la captation vidéo par défaut sur les nouveaux projets pour éviter le problème à la source.

## Étape A — Mode "force" qui ignore `record_video` si des segments existent

**Dans `supabase/functions/analyze-nonverbal/index.ts` :**

- Quand `force: true` est passé dans le body, NE PAS court-circuiter sur `!project?.record_video`.
- À la place, vérifier d'abord s'il existe au moins un `session_messages.video_segment_url` non null pour la session.
  - Si oui → continuer l'analyse normalement (le flag projet est ignoré).
  - Si non → garder le comportement actuel (`skipped: video_not_recorded`).
- Sans `force`, le comportement reste identique à aujourd'hui (respect strict de `record_video`).

**Dans `supabase/functions/retry-missing-analyses/index.ts` :**

- Adapter la fonction `needsRetry` pour la branche non-verbale : ne plus exclure les rapports quand `project.record_video = false` SI :
  - le rapport est `skipped` avec `reason: video_not_recorded` (ou simplement n'a pas de `profile`),
  - ET la session a au moins un `video_segment_url` non null.
- Pour éviter une requête par rapport, faire un seul `select` agrégé : compter les segments vidéo par session sur la fenêtre des 7 derniers jours, puis matcher en mémoire.
- Garder la limite `MAX_PER_RUN = 20` et le plafond 3 tentatives.

**Résultat attendu :** le rapport `9f99d7f6-…` (10 segments vidéo, `record_video=false`) sera relancé au prochain cron et analysé.

## Étape B — `record_video = true` par défaut sur les nouveaux projets

Deux endroits à aligner :

1. **Migration SQL** : `ALTER TABLE public.projects ALTER COLUMN record_video SET DEFAULT true;`
   - Ne touche PAS aux projets existants (uniquement le défaut pour les futurs `INSERT` qui n'envoient pas la valeur).
2. **Côté front** : dans `src/components/project/ProjectForm.tsx` (et tout autre endroit où un nouveau projet est créé), vérifier que la valeur initiale du toggle "Enregistrer la vidéo" est bien `true` à la création.
   - Lors d'une édition de projet existant, on respecte la valeur stockée (pas de modification).

## Étape C — Validation

1. Déployer `analyze-nonverbal` et appeler manuellement avec `force: true` sur la session `9f99d7f6-c450-4d8e-8290-bfcb5c1f59df` → vérifier que `nonverbal_analysis.status` passe à `ok` avec un `profile` rempli.
2. Déclencher manuellement `retry-missing-analyses` → vérifier qu'il prend en compte les rapports `skipped: video_not_recorded` ayant des segments vidéo.
3. Créer un nouveau projet via l'UI → vérifier que `record_video` vaut `true` par défaut dans la base.
4. Compter combien de rapports historiques vont être rattrapés (requête sur les 7 derniers jours).

## Hors scope

- Rapports antérieurs à la fenêtre de 7 jours (nécessiterait un script one-shot dédié).
- Rapports sans aucun segment vidéo en base (rien à analyser).
