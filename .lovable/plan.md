
# Mot de passe oublié : passage au code à 6 chiffres

## Objectif
Aujourd'hui, quand un utilisateur clique sur "Mot de passe oublié ?", il reçoit un email avec un lien magique qui l'authentifie puis le redirige vers `/reset-password`. On remplace ce mécanisme par un **code à 6 chiffres** saisi manuellement dans l'app, puis choix du nouveau mot de passe.

Ce changement ne touche **que le flux "mot de passe oublié"**. La connexion normale (email + mot de passe), les invitations, les magic links super-admin et la confirmation d'email restent inchangés.

## Parcours utilisateur cible

```text
1. Page Login → clic "Mot de passe oublié ?"
2. Saisie de l'email → clic "Envoyer le code"
3. Email reçu avec un code à 6 chiffres (valable 1 h, à usage unique)
4. Nouvel écran : champ email (pré-rempli) + champ code 6 chiffres
5. Vérification du code → si OK, écran "nouveau mot de passe"
6. Saisie + confirmation → mot de passe changé → redirection dashboard
```

Points clés côté UX :
- Message clair "Si un compte existe, un code a été envoyé" (pas de fuite d'existence de compte).
- Bouton "Renvoyer le code" avec compte à rebours de 60 s.
- Message d'erreur explicite si le code est faux ou expiré, avec possibilité d'en redemander un.
- Le code reste valable même si l'utilisateur ferme l'onglet : il peut revenir depuis n'importe quel appareil.

## Détails techniques

### Comment fonctionne le code 6 chiffres
Le backend d'authentification génère déjà, pour chaque email de recovery, à la fois un lien magique **et** un code numérique (`{{ .Token }}`). Aujourd'hui le template affiche uniquement le lien. Il suffit de :
1. Modifier le template `recovery.tsx` pour afficher le code à 6 chiffres au lieu (ou en plus) du bouton lien.
2. Côté front, vérifier le code avec `supabase.auth.verifyOtp({ email, token, type: "recovery" })`. Cet appel ouvre une session temporaire de type "recovery" qui autorise `updateUser({ password })`.

### Fichiers modifiés

**Front (React)**
- `src/pages/Login.tsx` : après envoi de `resetPasswordForEmail`, rediriger vers `/reset-password?email=...&step=code` au lieu d'afficher le dialogue actuel.
- `src/pages/ResetPassword.tsx` : refonte en machine à 2 étapes :
  - Étape 1 : email (pré-rempli via query param) + champ code 6 chiffres + bouton "Vérifier" + bouton "Renvoyer" (cooldown 60 s).
  - Étape 2 : nouveau mot de passe + confirmation (logique actuelle conservée : `validatePassword`, `updateUser`).
  - L'écran s'active directement en étape 1 sans dépendre de `PASSWORD_RECOVERY` event.
- `src/pages/AuthConfirm.tsx` : conserver le support `type=recovery` pour rétro-compat pendant quelques jours (anciens emails déjà envoyés). À supprimer une fois le stock d'emails purgé si souhaité.

**Email template**
- `supabase/functions/_shared/email-templates/recovery.tsx` : afficher le code 6 chiffres (`{{ .Token }}`) en gros, garder un texte court, retirer le bouton "Réinitialiser mon mot de passe" (ou le laisser en repli discret). Ajout d'un rappel de la durée de validité et de l'expéditeur.
- Redéploiement de `auth-email-hook` après modification.

**Configuration Supabase Auth**
- Vérifier que la durée d'expiration OTP est ≤ 3600 s (déjà demandé par l'audit sécurité). Le code 6 chiffres suit ce paramètre.

### Points de vigilance

- **Rate limiting** : `resetPasswordForEmail` a un rate limit natif (émission des emails). Ajout côté UI d'un cooldown "Renvoyer" pour éviter les 429.
- **Emails déjà en circulation** : les liens envoyés avant le déploiement continueront à fonctionner via `/auth/confirm` tant que la page est là.
- **Message d'erreur unifié** à l'envoi (pas de distinction "email inconnu" vs "email envoyé") pour ne pas révéler l'existence d'un compte.
- **Tests E2E** : mettre à jour `tests/e2e/` si un scénario couvrait le lien magique de recovery (à vérifier lors de l'implémentation).
- **Aucune migration SQL** requise.

## Ce qui n'est PAS changé
- Connexion classique email/mot de passe.
- Magic links super-admin (`superadmin-impersonate`, `redeem-magic-link`).
- Invitations d'organisation.
- Confirmation d'inscription / changement d'email.
- Politique de mot de passe (`validatePassword`).

## Livrables
1. `Login.tsx` : redirection vers la nouvelle page après envoi.
2. `ResetPassword.tsx` : formulaire à 2 étapes (code puis mot de passe).
3. `recovery.tsx` (template email) : affichage du code 6 chiffres.
4. Redéploiement de `auth-email-hook`.
5. Vérification manuelle bout-en-bout avec un compte de test avant publication.
