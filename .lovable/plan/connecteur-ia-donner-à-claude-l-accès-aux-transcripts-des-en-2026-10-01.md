# Connecteur IA : donner à Claude l'accès aux transcripts des entretiens

## Objectif
Faire en sorte que Claude puisse lire le texte des entretiens candidats via le connecteur Interw.

## Pourquoi ça ne marche pas
Claude obtient bien la liste des postes, des candidats et les rapports. Mais dès qu'il demande un transcript, le connecteur plante à cause d'une faute dans son code : il cherche une information dans un endroit qui n'existe pas dans la base. C'est ce que Claude rapporte dans son message (« column session_messages.created_at does not exist ») — ce n'est ni un problème de droits, ni de connexion, ni un choix de notre part d'exclure quelque chose. C'est simplement un bug d'appellation dans la requête de l'outil « Transcription d'entretien ».

## Correction
1. Corriger la requête de l'outil « Transcription d'entretien » pour qu'elle lise dans le bon endroit.
2. En profiter pour n'envoyer à Claude que le texte utile : qui dit quoi, dans l'ordre (questions de l'IA, réponses du candidat, relances), sans les liens techniques des fichiers vidéo/audio.
3. Redéployer le connecteur côté serveur.
4. Tester avec une vraie session terminée pour confirmer que Claude peut maintenant lire le transcript.

## Impact
- Un seul outil du connecteur modifié ; aucun changement d'écran ni de données.
- Les autres outils (postes, candidats, rapports) restent identiques.
- Après le redéploiement, Claude n'aura pas besoin de se reconnecter : il pourra relire les transcripts immédiatement.
- Aucun impact sur le site lui-même.

## Détails techniques
- `src/lib/mcp/tools/get-transcript.ts` : la colonne de date de la table `session_messages` s'appelle `timestamp`, pas `created_at` ; corriger le `.order()` et préciser les colonnes renvoyées (role, content, timestamp, question_id, is_follow_up, transcription_status).
- Le fichier `supabase/functions/mcp/index.ts` est régénéré automatiquement, puis la fonction `mcp` est redéployée.
- Vérification : appel de `get_transcript` sur la session `/sessions/950c016e-f51e-40fc-9b42-7b472b822376` (fiche de référence).
