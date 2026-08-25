# Archiver les anomalies dans « Candidats à repasser »

## Objectif
Pouvoir écarter de la liste de travail une ligne d'anomalie (candidat ayant repassé son entretien de lui-même, cas non pertinent…) sans jamais supprimer la session, et pouvoir retrouver toutes les lignes archivées.

## Comportement visé
- Un bouton « Archiver » sur chaque ligne du suivi continu, avec une note facultative (raison).
- Les lignes archivées disparaissent des filtres « À faire / Relancés / Repassés ».
- Un nouveau filtre « Archivées » affiche uniquement ces lignes, avec la date, l'auteur de l'archivage et la note.
- Sur une ligne archivée : bouton « Restaurer » pour la remettre dans le suivi.
- Le filtre « Toutes » reste disponible et inclut les archivées, marquées d'un badge « Archivée ».
- Aucune session, aucun rapport, aucun média n'est supprimé : l'archivage est un simple marquage.

## Détails techniques
- Nouvelle table `recovery_anomaly_archives` : `session_id` (unique, référence `sessions`), `archived_by`, `note`, `created_at`. Accès réservé aux super-admins (lecture/écriture), plus `service_role`, avec les GRANT correspondants.
- La fonction `admin_list_recoverable_candidates` est mise à jour pour renvoyer trois champs supplémentaires : `archived_at`, `archived_by_email`, `archive_note` (jointure LEFT, aucune ligne exclue côté base).
- `src/pages/AdminCandidatesToRecover.tsx` :
  - type `Recoverable` étendu avec les champs d'archive ;
  - `Lifecycle` complété par `archived`, prioritaire sur les autres états dans `computeLifecycle` ;
  - onglets de filtre : À faire / Relancés / Repassés / Archivées / Toutes, avec compteurs ;
  - boutons « Archiver » (petite boîte de dialogue avec champ note) et « Restaurer », suivis d'un rechargement de la liste ;
  - le renvoi d'e-mail reste indisponible sur une ligne archivée tant qu'elle n'est pas restaurée.
