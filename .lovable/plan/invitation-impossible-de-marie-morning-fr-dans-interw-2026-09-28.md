# Invitation impossible de marie@morning.fr dans « Interw »

## Ce qui est vérifié
- L'organisation s'appelle **Interw** ; Eva en est bien propriétaire et administratrice : les droits d'invitation sont bons.
- marie@morning.fr a déjà un compte, rattaché à **Morning**. Elle n'est pas membre d'Interw et aucune invitation n'existe pour elle dans Interw : la tentative n'a rien enregistré.
- Le message « Erreur / Erreur » vient du code du bouton : quand la base renvoie un refus, le vrai motif est jeté et remplacé par le mot « Erreur ». C'est pour ça qu'on ne voit pas la raison.

## Ce qui n'est pas vérifié
- La raison exacte du refus. Les journaux du serveur sont vides pour ce créneau, je ne peux donc pas la lire. Je ne veux pas deviner.

## Plan
1. **Afficher le vrai motif** dans la notification d'erreur du bouton « Inviter » (et des autres actions de la même carte : retirer, changer de rôle, annuler).
2. **Reproduire le refus** en simulant l'invitation en tant qu'Eva dans une opération annulée aussitôt (rien n'est enregistré, aucun e-mail envoyé), pour lire le motif exact.
3. **Corriger au plus petit** selon ce motif, puis inviter marie@morning.fr pour de bon.
4. **Plusieurs organisations par compte** : Marie garde Morning et reçoit Interw en plus. Vérifié : accepter une invitation ajoute l'organisation sans changer celle qui est ouverte, et le sélecteur en haut à gauche de la barre latérale apparaît dès qu'un compte a au moins 2 organisations. Je contrôlerai dans l'aperçu que Marie passe bien de Morning à Interw depuis ce sélecteur, et je corrigerai si ce n'est pas le cas.

## Impact
- Candidat : aucun effet.
- Recruteur : les erreurs de la carte « Membres » affichent enfin une raison lisible au lieu de « Erreur ».
- Build : risque très faible (texte de notification uniquement à l'étape 1) ; la correction de l'étape 3 sera décrite avant application si elle touche la base.
- Vérification : test E2E candidat puis recruteur (bloqués par le fichier de configuration manquant déjà connu) + contrôle direct de l'invitation dans l'aperçu.

## Détails techniques
- `src/components/OrgMembers.tsx` : `catch` → `e?.message ?? e?.details ?? "Erreur"` (les erreurs de la base ne sont pas des `Error`).
- Reproduction : `begin; set local role authenticated; set local request.jwt.claims = {sub: eva}; insert … returning token; rollback;`.
