# Améliorer la délivrabilité des emails Interw

## Diagnostic

- Domaine `notify.interw.ai` **vérifié** (DKIM/SPF/DMARC OK, gérés par Lovable Cloud).
- 7 derniers jours : ~5 200 envois, **0 bounce dur récent**, 119 suppressions historiques → côté DNS, tout est sain.
- Les emails partent depuis `noreply@notify.interw.ai`, nom d'expéditeur = `interw.ai`, **sans `Reply-To`** pour le mail de remerciement candidat (le gros volume).

Le problème est éditorial, pas technique. Les filtres Gmail/Outlook pénalisent surtout :
1. Le préfixe `noreply@` (signal négatif fort depuis 2024).
2. L'absence de `Reply-To` → "email auquel on ne peut pas répondre" = score spam +.
3. Sujet par défaut très générique (`"Merci pour votre entretien"`).
4. Template court, ratio HTML/texte faible, pas de footer identifiable.

## Plan d'action (étapes 1-4, code uniquement)

### 1. Adresse expéditrice
- Remplacer `noreply@notify.interw.ai` → `hello@notify.interw.ai`.
- Mettre à jour le nom From de `interw.ai` → `Interw` (plus propre dans l'inbox).
- Fichiers : `send-transactional-email/index.ts`, `generate-report/index.ts`.

### 2. Reply-To par défaut
- Ajouter une constante `DEFAULT_REPLY_TO = "contact@interw.ai"` utilisée si l'appelant n'en fournit pas.
- Pour `candidate-thank-you` : passer en `replyTo` l'email du créateur du projet (lookup `profiles.email` via `projects.created_by`), fallback `contact@interw.ai`. Modifié dans `finalize-session/index.ts`.
- Pour `interview-report` : déjà OK (utilise l'email candidat).

### 3. Sujet du mail candidat
- Sujet par défaut → `"Confirmation de votre entretien {jobTitle} – {orgName}"` (plus spécifique = meilleur engagement).
- L'override par projet/organisation reste prioritaire.
- Fichier : `candidate-thank-you.tsx`.

### 4. Enrichir le template `candidate-thank-you`
- Ajouter un **en-tête** avec le nom "Interw" stylé (pas de logo image pour rester simple, on évite les images externes qui peuvent casser).
- Ajouter une **mention contextuelle** en tête de mail : *"Vous recevez cet email car vous avez passé un entretien pour le poste de {jobTitle} chez {orgName}."* — justifie le caractère transactionnel pour les filtres.
- Ajouter un **footer** avec : "Interw — Plateforme d'entretien IA", lien vers `interw.ai`, mention "Si vous n'êtes pas {firstName}, vous pouvez ignorer ce mail.".
- Rééquilibrer le ratio HTML/texte (un peu plus de copie réelle).

## Hors-scope (pas dans ce ticket)

- Dashboard `/admin/email-health` (étape 5 — à voir après).
- Google Postmaster Tools / DMARC reporting (actions DNS, à faire manuellement).
- Pas de changement DNS ni de migration vers Resend/SendGrid.

## Fichiers modifiés

- `supabase/functions/send-transactional-email/index.ts`
- `supabase/functions/generate-report/index.ts`
- `supabase/functions/finalize-session/index.ts`
- `supabase/functions/_shared/transactional-email-templates/candidate-thank-you.tsx`

Puis redéploiement des 3 edge functions modifiées.
