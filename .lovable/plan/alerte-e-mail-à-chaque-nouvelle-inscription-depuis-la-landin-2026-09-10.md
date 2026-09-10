# Alerte e-mail à chaque nouvelle inscription depuis la landing

## Objectif
Recevoir un e-mail sur eva@interw.com dès qu'une personne crée un compte via le bouton « Commencez gratuitement » de la page d'accueil (page d'inscription publique). Les collaborateurs ajoutés par invitation ne déclenchent pas cette alerte.

## Contenu de l'e-mail
- Objet : « Nouvelle inscription Interw »
- Nom saisi, adresse e-mail, date et heure (Paris)
- Rappel que le compte est en attente de confirmation de l'e-mail
- Répondre à l'e-mail écrit directement au nouvel inscrit

## Fonctionnement
L'alerte part au moment où l'inscription est acceptée, avant même que la personne confirme son adresse. Si la même adresse s'inscrit plusieurs fois d'affilée, un seul e-mail part (anti-doublon), et une limite de débit empêche l'envoi en rafale depuis une même source.

## Détails techniques
- Nouveau modèle `supabase/functions/_shared/transactional-email-templates/new-signup.tsx` (`to: 'eva@interw.com'`), calqué sur `demo-request.tsx`, enregistré dans `registry.ts`.
- Nouvelle fonction `supabase/functions/notify-new-signup/index.ts`, structure identique à `send-demo-request` : CORS, `verify_jwt = false` dans `config.toml`, validation du nom/e-mail, limite 3 requêtes / 10 min par IP, appel `sendAppEmail('new-signup', ...)` avec `replyTo` = inscrit et `idempotencyKey` = `new-signup-<email>`. Copie du `deno.json` de `preview-transactional-email`.
- `src/pages/Signup.tsx` : après un `signUp()` réussi (branche `setStep("sent")` uniquement, pas la branche « compte existant »), appel non bloquant `supabase.functions.invoke('notify-new-signup', { body: { email, fullName } })` ; toute erreur est ignorée côté interface.
- Déploiement de `notify-new-signup` et `preview-transactional-email`.

## Vérification
- Build + typecheck.
- Aperçu du modèle et contrôle du journal d'envoi après un test d'inscription.
