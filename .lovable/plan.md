# Plan — Remplacer "interw.ai" par "interw" dans le texte visible des emails

## Diagnostic
Le nom visible du produit dans les emails vient de `SITE_NAME = "interw.ai"` dans `supabase/functions/auth-email-hook/index.ts`. Cette variable est injectée comme `siteName` dans tous les templates auth (signup, magic-link, recovery, **invite**, email-change, reauthentication). C'est pourquoi l'email d'invitation affiche "Vous êtes invité(e) sur interw.ai".

Deux autres fichiers contiennent encore "Interw.ai" en dur dans du texte visible, et un template app email aussi.

## Changements (texte visible uniquement — domaines techniques `interw.ai` conservés)

1. `supabase/functions/auth-email-hook/index.ts`
   - `SITE_NAME = "interw.ai"` → `"interw"`
   - Conserver `REPLY_TO_EMAIL`, `SENDER_DOMAIN`, `ROOT_DOMAIN`, `FROM_DOMAIN` inchangés (techniques).

2. `supabase/functions/_shared/email-templates/signup.tsx`
   - `<Preview>Encore une étape pour activer votre compte Interw.ai</Preview>` → `... compte interw`

3. `supabase/functions/_shared/email-templates/reauthentication.tsx`
   - `L'équipe Interw.ai` → `L'équipe interw`

4. `supabase/functions/_shared/transactional-email-templates/demo-request.tsx`
   - `<Preview>Nouvelle demande de démo Interw.ai</Preview>` → `... démo interw`
   - Le champ `to: 'hello@interw.ai'` (adresse) reste inchangé.

## Hors-scope
- Tous les `https://interw.ai/...` et `mailto:...@interw.ai` restent (domaine technique).
- Aucune modif des templates où "interw.ai" apparaît uniquement comme URL ou email d'expéditeur/contact.

## Déploiement
Redéployer les fonctions impactées : `auth-email-hook` et `send-transactional-email`.
