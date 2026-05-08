## Objectif

La liste des sessions d'un projet n'affiche **que les sessions exploitables** : statut `completed`, transcription terminée et rapport généré. Les sessions `pending`, `in_progress`, `cancelled`, `expired`, et celles `completed` mais encore en cours de traitement sont masquées.

## Modifications dans `src/pages/ProjectDetail.tsx` (frontend uniquement)

**1. Charger l'état de transcription**
Ajouter une requête `session_messages` (sélection : `session_id, transcription_status`) filtrée sur les messages candidat avec `video_segment_url` ou `audio_segment_url` non nuls, pour les sessions du projet. Construire `pendingTranscriptionBySession: Map<sessionId, number>`.

**2. Définir une session "prête"**
```
isReady(s) = s.status === 'completed'
          && reportsBySession[s.id]
          && (pendingTranscriptionBySession.get(s.id) ?? 0) === 0
```

**3. Filtrer la liste**
Dans `filteredSessions` (ligne ~425) : ne garder que les sessions `isReady`.

**4. Compteurs et stats**
- `completedSessions` (ligne 408) → utilise `isReady`.
- Supprimer ou masquer les blocs/onglets dédiés à `pending` et `in_progress` (lignes 407, 409, 878, 930). Conserver uniquement la vue "sessions prêtes".
- Le compteur "X / Y" devient "N sessions prêtes" (et éventuellement "+ M en cours de traitement" en petit gris si on veut rassurer).

**5. Bandeau d'info discret**
Au-dessus de la liste, afficher un message gris si des sessions sont en attente :
> "3 entretiens en cours de traitement — ils apparaîtront automatiquement une fois le rapport prêt."

Aucun bouton, juste l'info. Disparaît s'il n'y a rien en attente.

**6. Filtre `statusFilter`**
Le sélecteur de statut (ligne 98) devient inutile (toutes les sessions visibles ont le même statut effectif). À supprimer du popover de filtres.

**7. Rafraîchissement**
Vérifier que la requête sessions de `ProjectDetail` a un `refetchInterval` (ex. 10 s) pour que les sessions apparaissent automatiquement dès qu'elles sont prêtes, sans rechargement manuel.

## Hors scope

- Pas de migration BDD.
- Pas de modification des edge functions.
- La page détail de session reste accessible par lien direct (notifications email, partage).