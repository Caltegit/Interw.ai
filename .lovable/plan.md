# Connecteur IA : rendre les transcriptions lisibles par Claude

## Cause
L'outil « Transcription d'entretien » du connecteur trie les échanges par une colonne `created_at` qui n'existe pas dans la table des échanges. La vraie colonne de date s'appelle `timestamp`. Résultat : erreur systématique, alors que les listes de postes, candidats et rapports fonctionnent.

## Correction
1. Trier les échanges par `timestamp` au lieu de `created_at`.
2. Ne renvoyer que les informations utiles à la lecture : rôle (recruteur IA / candidat), question liée, texte, horodatage, relance ou non. Les liens vers les fichiers vidéo/audio ne sont plus envoyés à l'IA.
3. Ignorer les sessions de démonstration ? Non : comportement inchangé, les droits d'accès restent ceux de l'utilisateur connecté.
4. Redéployer le connecteur, puis appeler l'outil sur une vraie session terminée pour confirmer qu'il renvoie bien le texte.

## Impact
- Un seul outil du connecteur modifié ; aucun changement de base de données, d'écran ni de calcul.
- Effet immédiat pour Claude après redéploiement, sans reconnexion nécessaire.
- Risque de casse : nul pour le site.

## Détails techniques
- `src/lib/mcp/tools/get-transcript.ts` : `.select("id, role, question_id, content, timestamp, is_follow_up, transcription_status")` et `.order("timestamp", { ascending: true })`.
- Le fichier `supabase/functions/mcp/index.ts` est régénéré automatiquement, puis la fonction `mcp` est redéployée.
