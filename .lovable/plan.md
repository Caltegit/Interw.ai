
## Correctif — Accès partagé aux entretiens

### Diagnostic
Arnaud est bien dans `projects.visible_to_user_ids`, mais les RLS `SELECT` sur `sessions`, `reports`, `session_messages` et `transcripts` n'accordent l'accès qu'aux membres de l'organisation propriétaire (ou super admins). Le partage projet ne se propage donc pas aux données d'entretien.

### Migration

Ajout d'une fonction `SECURITY DEFINER` `has_project_access(_user, _project)` qui renvoie true si l'utilisateur est :
- créateur du projet, OU
- dans `visible_to_user_ids`, OU
- membre de l'organisation propriétaire, OU
- propriétaire de l'organisation, OU
- super admin.

Puis nouvelles policies `SELECT` (`TO authenticated`, additives) sur :
- `sessions` : `has_project_access(auth.uid(), project_id)`
- `session_messages` : via la session parente
- `reports` : via la session parente
- `transcripts` : via la session parente

Les policies existantes restent en place. Aucune écriture élargie.

### Vérification post-migration
1. Compter les sessions visibles pour Arnaud (attendu : 243, actuellement 0).
2. Non-régression : un utilisateur random non partagé et hors org voit toujours 0.
3. Non-régression : membre ALBO voit toujours ses sessions.
4. Security scan pour confirmer qu'aucune nouvelle finding critique n'apparaît.

Passe en mode build pour lancer la migration.
