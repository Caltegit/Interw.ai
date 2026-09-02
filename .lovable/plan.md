# Détection « vous avez déjà un compte » à l'inscription

## Ce que disent les données

- `eva.bdanel28@gmail.com` **n'avait aucun compte** avant aujourd'hui : le compte a été créé à 11:48 lors de ton test. L'organisation « Eva & co » appartient à un autre utilisateur, et cette adresse n'y est pas rattachée.
- Ce qui existait pour cette adresse : une **invitation en attente vers ALBO**, créée le 24/08 et **expirée le 31/08**. Elle a donc été ignorée à la confirmation d'email, et le compte s'est retrouvé sans organisation.

Donc le message « vous avez déjà un compte » ne s'est pas affiché parce qu'il n'y avait effectivement pas de compte. Mais le test a révélé deux vrais défauts.

## Défaut 1 — le message n'apparaîtrait de toute façon jamais

Le service d'authentification ne renvoie **pas** d'erreur « déjà inscrit » quand l'email existe et est confirmé (protection anti-énumération) : il renvoie un faux succès. Notre branche « compte existant » dans `/signup` est donc du code mort. Résultat aujourd'hui : quelqu'un qui a déjà un compte voit « Vérifiez votre boîte mail » et n'attend un email qui n'arrivera jamais.

**Correctif** : le faux succès est reconnaissable — la réponse contient un utilisateur dont la liste d'identités est vide. Dans `src/pages/Signup.tsx`, tester ce cas et afficher l'écran « Cette adresse a déjà un compte » avec un lien vers `/login` et un lien « mot de passe oublié », au lieu de l'écran de vérification d'email.

## Défaut 2 — invitation expirée ignorée en silence

À la confirmation d'email, seule une invitation **non expirée** rattache le nouvel inscrit à l'organisation. Avec une invitation expirée, il part sur `/bienvenue` et crée une organisation en doublon, alors qu'il était attendu dans une organisation existante.

**Correctif proposé** : sur `/bienvenue`, si une invitation existe pour cette adresse mais est expirée, ne pas proposer la création d'organisation. Afficher : « Vous avez été invité(e) à rejoindre {organisation}, mais le lien a expiré — demandez à l'administrateur de renvoyer l'invitation », avec un bouton pour notifier l'administrateur. Un utilisateur sans aucune invitation garde le parcours actuel.

## Détails techniques

- `src/pages/Signup.tsx` : après `signUp`, si `data.user && data.user.identities?.length === 0` → état `existing` (nouvel écran), plus de dépendance au message d'erreur. Garder la branche erreur actuelle en filet.
- `src/pages/Onboarding.tsx` : requête sur `organization_invitations` (email courant, statut `pending`) ; si trouvée et `expires_at` dépassée → écran « invitation expirée » à la place du formulaire. Si trouvée et valide → accepter l'invitation et rediriger vers `/dashboard`.
- Nouvelles clés FR/EN dans `auth.json` pour les deux écrans.

## Ménage

Le compte de test `eva.bdanel28@gmail.com` (sans organisation) peut être supprimé après validation — dis-moi si tu veux que je le fasse.

## Vérification

1. S'inscrire avec `eva@alboteam.com` → écran « compte existant » + lien connexion.
2. S'inscrire avec une adresse neuve → écran de vérification d'email, puis `/bienvenue`.
3. S'inscrire avec une adresse ayant une invitation expirée → message d'invitation expirée, pas de création d'organisation.
