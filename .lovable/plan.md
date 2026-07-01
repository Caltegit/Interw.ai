## Ce qui s'est réellement passé

Eva a bien été supprimée. Mais lors de la nouvelle invitation, la combinaison de deux mécanismes a produit l'effet « compte fantôme » :

1. **`send-invitation` appelle `supabase.auth.admin.inviteUserByEmail`.** Cette API Supabase **crée immédiatement** une ligne dans `auth.users` (visible dans les données : user Eva créé 2 secondes après l'insertion de l'invitation, bien avant qu'elle ne clique). Le lien envoyé par mail est un lien magique type `invite` : cliquer suffit à signer la session — pas de mot de passe demandé, pas de page `/invite/{token}` avec formulaire.

2. **Le trigger `handle_new_user` (correctif précédent)** se déclenche sur `AFTER INSERT` de `auth.users`. Il rattache instantanément l'utilisateur fraîchement créé à l'invitation `pending` et bascule l'invitation en `accepted`. Résultat côté Benjamin : plus aucune invitation « en attente », Eva apparaît comme membre avant même d'avoir ouvert son mail.

Vérification base : invitation `accepted` à 13:16:32, user créé à 13:16:34, `email_confirmed_at` seulement à 13:19:45 (moment du clic). L'auto-linking a bien eu lieu avant tout acte d'Eva. Le compte est bien réel, mais il a été fabriqué par l'appel d'invitation lui-même — d'où l'illusion « son compte n'avait pas été supprimé ».

## Correctif

### 1. Ne rattacher qu'après confirmation réelle
Remplacer le trigger `handle_new_user` par un trigger qui ne fait l'auto-link qu'à la **confirmation d'email** (première vraie action d'Eva), pas à la création de la ligne `auth.users` :

- Trigger `AFTER UPDATE ON auth.users` quand `OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL` → exécute la logique de rattachement (membership + `profiles.organization_id` + invitation `accepted`).
- Garder aussi un trigger `AFTER INSERT` mais uniquement pour créer la ligne `profiles` vide (comportement historique) et rattacher **seulement si `NEW.email_confirmed_at IS NOT NULL`** (cas SSO/OAuth où la confirmation est simultanée).

Effet : tant qu'Eva n'a pas cliqué son lien, l'invitation reste `pending` côté Benjamin.

### 2. Exiger la création d'un mot de passe
Le flux actuel via `inviteUserByEmail` donne accès sans mot de passe. On revient à un flux « invitation → page publique → création de compte » :

- `send-invitation` : ne plus appeler `auth.admin.inviteUserByEmail`. À la place, envoyer un email transactionnel (`send-transactional-email`) avec un lien direct vers `https://interw.ai/invite/{token}`.
- La page `InviteSignup` existante prend le relais : vérification du token, saisie nom + mot de passe, `signUp` classique, puis `accept_invitation`.
- Le lien contient uniquement le token d'invitation applicatif (pas un OTP Supabase), donc il n'est pas consommé par les scanners anti-spam et reste valide jusqu'à `expires_at`.

### 3. Filet de sécurité `AuthContext` conservé
Il reste utile pour les cas limites (utilisateur déjà existant qui reçoit une nouvelle invitation, changement d'email, etc.) — pas de changement.

### 4. Nettoyage d'Eva pour retester proprement
Suppression cascade : `auth.users` (id `d4dbd7e9…`), `profiles`, `organization_members`, et `organization_invitations` `accepted` associée. Benjamin pourra relancer une invitation propre pour valider le nouveau flux.

## Fichiers touchés

- Migration : refonte de `handle_new_user` en deux triggers (INSERT confirmé / UPDATE confirmation).
- `supabase/functions/send-invitation/index.ts` : passage au mail transactionnel + lien `/invite/{token}` (plus d'`inviteUserByEmail`).
- Nouveau template email d'invitation dans `_shared/transactional-email-templates/`.
- Data-change : suppression complète d'Eva.

## Vérification attendue

- Benjamin invite Eva → invitation `pending` visible.
- Eva reçoit l'email, clique → arrive sur `/invite/{token}`, doit choisir un mot de passe.
- Après validation → rattachée à Albo, invitation `accepted`, Benjamin voit le changement.
- Aucun compte auth n'est créé tant qu'Eva n'a pas soumis le formulaire.
