## Objectif

Sur la page candidat d'entretien (`InterviewStart.tsx`), ajouter à côté du bouton « Arrêter la session » un lien « Signaler un problème » qui :
1. Met l'entretien en pause automatiquement.
2. Ouvre une popup avec un champ texte (description du problème).
3. Envoie le message par email directement au créateur du projet.

Et rafraîchir le design des deux boutons d'action (Arrêter / Pause) pour qu'ils soient plus soignés.

## Modifications

### 1. Nouveau template email transactionnel
Fichier : `supabase/functions/_shared/transactional-email-templates/interview-issue-report.tsx`
- React Email respectant le style des templates existants (`interview-report.tsx`).
- Props : `candidateName`, `jobTitle`, `message`, `sessionId`, `sessionUrl`.
- Sujet : `Problème signalé par un candidat — {jobTitle}`.
- Footer unsubscribe géré automatiquement.

Mise à jour de `registry.ts` pour ajouter `'interview-issue-report'`.

### 2. Nouvelle edge function publique
Fichier : `supabase/functions/report-interview-issue/index.ts` (verify_jwt = false, accessible sans auth car page candidat publique).
- Reçoit `{ sessionId, message }` (validation Zod : message 5–2000 caractères).
- Avec service role key : récupère la session → projet → `created_by` → email via `auth.users` + `profiles`.
- Récupère `candidate_name`, `job_title`.
- Appelle `send-transactional-email` (en interne via service role) avec template `interview-issue-report`, idempotency `issue-${sessionId}-${timestamp_court}`.
- Renvoie `{ ok: true }`.

Ajout dans `supabase/config.toml` : `[functions.report-interview-issue] verify_jwt = false`.

### 3. UI candidat — `src/pages/InterviewStart.tsx` (zone lignes 3372–3400)

Refonte de la barre d'actions :
- Boutons en `rounded-full`, bordure subtile, padding plus généreux, icônes alignées.
- « Arrêter la session » → variant `outline` rouge subtil au hover.
- « Mettre en pause » → variant `outline` neutre.
- Nouveau « Signaler un problème » → variant `ghost` discret avec icône `Flag`, couleur muted.

Au clic sur « Signaler un problème » :
1. Si l'entretien tourne, appelle `pauseInterview("manual")`.
2. Ouvre un nouveau `Dialog` (state `showReportDialog`).

### 4. Nouveau Dialog « Signaler un problème »
Dans `InterviewStart.tsx`, à côté du `showEndDialog` existant :
- Titre : « Signaler un problème ».
- Sous-titre court : « Votre entretien est mis en pause. Décrivez ce qui ne va pas, le recruteur sera prévenu. »
- `Textarea` (min 5 caractères, placeholder : « Ex. Le micro coupe régulièrement… »).
- Boutons : « Envoyer » (primary, loading state) + « Annuler ».
- Au submit → `supabase.functions.invoke('report-interview-issue', { body: { sessionId, message } })` puis toast succès et fermeture. Erreur → toast destructif.

## Hors périmètre
- Pas d'historique des signalements en base (envoi email seul, comme demandé).
- Pas de modification du flow de pause existant.
- Pas de notification in-app côté RH.

## Fichiers touchés
- ✏️ `src/pages/InterviewStart.tsx`
- ➕ `supabase/functions/report-interview-issue/index.ts`
- ➕ `supabase/functions/_shared/transactional-email-templates/interview-issue-report.tsx`
- ✏️ `supabase/functions/_shared/transactional-email-templates/registry.ts`
- ✏️ `supabase/config.toml` (entrée verify_jwt pour la nouvelle fonction)
- 🚀 Déploiement : `report-interview-issue` + `send-transactional-email` (rebuild registry).
