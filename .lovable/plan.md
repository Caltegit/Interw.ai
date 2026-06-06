# Améliorer la délivrabilité des emails d'authentification

## Contexte

Le "mot de passe oublié" du Login déclenche `signInWithOtp` → email `magiclink` envoyé par `auth-email-hook` (séparé du transactionnel). Les optimisations anti-spam déjà appliquées ne s'appliquent qu'aux emails transactionnels (`send-transactional-email`). Il faut les répliquer ici.

## Changements

### 1. `supabase/functions/auth-email-hook/index.ts`

- Remplacer l'expéditeur : `noreply@notify.interw.ai` → `hello@notify.interw.ai`.
- Réécrire les sujets pour être plus naturels, moins répétitifs :
  - `magiclink` : `"Votre lien de connexion"` (au lieu de "Votre lien de connexion Interw.ai")
  - `recovery` : `"Réinitialisez votre mot de passe"`
  - `signup` : `"Confirmez votre adresse email"`
  - `invite` : `"{inviter} vous invite sur Interw"` (fallback : "Vous avez été invité sur Interw")
  - `email_change` : `"Confirmez votre nouvelle adresse"`
  - `reauthentication` : `"Code de vérification : {token}"`
- Ajouter un header `List-Unsubscribe` dans le payload enqueue (même si techniquement les auth emails en sont exemptés, l'absence pénalise le score). Pointer vers `mailto:hello@interw.ai?subject=unsubscribe`.

### 2. Templates `_shared/email-templates/magic-link.tsx` et `recovery.tsx`

Étoffer le contenu pour améliorer le ratio texte/lien (un email de 3 lignes avec 1 bouton = signal spam fort) :

- Ajouter un `Preview` plus descriptif et personnel ("Cliquez pour vous reconnecter à Interw — lien valable 1h").
- Ajouter 2-3 phrases utiles : durée de validité du lien, rappel qu'il est à usage unique, conseil de vérifier l'expéditeur, mention que personne d'Interw ne demandera jamais le mot de passe.
- Ajouter le **lien en texte brut** sous le bouton ("Si le bouton ne fonctionne pas, copiez ce lien : ...") — c'est un signal positif et améliore l'UX mobile.
- Garder le ton sobre, pas de couleurs criardes ni d'emojis dans le sujet/preview.

### 3. Pas de changement côté UI / business logic

Le flow Login + dialog "Vérifiez votre boîte mail" reste identique.

## Vérification

1. Déployer `auth-email-hook` après les changements.
2. Déclencher un "mot de passe oublié" depuis le Login sur une adresse Gmail de test.
3. Vérifier : (a) l'email arrive en boîte principale, (b) le From est `hello@notify.interw.ai`, (c) le sujet et le contenu sont corrects.
4. Consulter `email_send_log` pour confirmer le `status = sent`.

## Hors-scope

- Marketing/newsletter (non supporté).
- Changement du domaine d'envoi (`notify.interw.ai` reste).
- Configuration DNS (déjà OK puisque les autres emails passent).
