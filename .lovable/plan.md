# Signalement candidat → Feedback super admin uniquement

## Comportement actuel
La fonction `report-interview-issue` envoie un email à la personne qui a créé la session (le recruteur).

## Nouveau comportement
La fonction crée uniquement un fil de feedback visible par les super admins. **Plus aucun email envoyé.**

## Modifications

### `supabase/functions/report-interview-issue/index.ts`
- Supprimer toute la logique d'envoi d'email (récupération profil, appel à `send-transactional-email`, gestion des réponses email).
- Récupérer la session (`candidate_name`, `candidate_email`, `project_id`) et le projet (`title`, `job_title`).
- Récupérer le premier super admin via `SELECT user_id FROM user_roles WHERE role='super_admin' LIMIT 1`.
- Insérer un fil dans `feedback_threads` :
  - `user_id` = id du super admin (requis NOT NULL)
  - `subject` = `Signalement candidat — {candidate_name} ({job_title})`
  - `status` = `'open'`
- Insérer un message initial dans `feedback_messages` :
  - `thread_id` = id du fil
  - `author_id` = id du super admin
  - `author_role` = `'user'`
  - `content` :
    ```
    Signalement reçu pendant l'entretien.

    Candidat : {candidate_name} ({candidate_email})
    Poste : {job_title} — {project_title}
    Session : https://interw.ai/sessions/{session.id}

    Message du candidat :
    {message}
    ```
- Retourner `{ ok: true }` comme avant (le côté candidat affiche déjà « Signalement envoyé »).

### Côté candidat
Aucune modification de l'UI : le toast actuel « Signalement envoyé. Le recruteur a été prévenu. » reste pertinent. Si tu veux changer le wording, dis-le-moi.

### Template email
Le template `interview-issue-report.tsx` n'est plus utilisé mais on le laisse en place (inerte) au cas où on voudrait réactiver l'envoi plus tard.

## Fichiers touchés
- `supabase/functions/report-interview-issue/index.ts` (réécriture)
