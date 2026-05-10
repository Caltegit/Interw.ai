## Problème

Quand un utilisateur **connecté** (à une autre organisation, ou simplement authentifié) ouvre un lien de partage `/shared-report/...`, il voit « Lien de partage introuvable ou expiré ».

Cause : les politiques d'accès qui autorisent la lecture via un lien de partage sont restreintes au rôle `anon` uniquement. Dès qu'un utilisateur est connecté, il passe en rôle `authenticated` et ces politiques ne s'appliquent plus — il ne voit que ses propres partages / rapports de son organisation.

Tables concernées : `report_shares`, `reports`, `session_messages`, `transcripts` (et probablement `sessions` côté lecture publique liée à un partage).

## Correctif

Étendre les politiques de lecture « via lien de partage actif » au rôle `authenticated` en plus de `anon`, pour qu'un visiteur connecté puisse aussi consulter un rapport partagé tant que le token est valide et non expiré.

Concrètement, ajouter (ou recréer en `PUBLIC`) une politique SELECT sur :
- `report_shares` : lecture autorisée si `is_active` et non expiré
- `reports` : lecture autorisée s'il existe un `report_shares` actif et non expiré pointant vers le rapport
- `session_messages` et `transcripts` : même condition via la session liée au rapport partagé

Les politiques existantes pour `anon` restent en place (ou sont remplacées par des politiques `PUBLIC` équivalentes).

Aucun changement côté frontend — le bug est purement côté règles d'accès base de données.

## Vérification

Tester avec un compte connecté à une autre organisation : le lien `/shared-report/<token>` doit afficher le rapport au lieu du message d'erreur.
