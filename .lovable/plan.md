

# Simplifier la colonne Candidat : retirer l'historique texte

## Ce qui change

Dans la colonne droite (Candidat), on supprime :
- Le bloc **historique conversation** (Card avec les messages texte, lignes 722-746)
- Le bloc **transcript en direct** (zone "en cours...", lignes 748-754)

On garde uniquement :
- Le retour vidéo du candidat
- Les boutons d'action (Envoyer ma réponse, Micro, Raccrocher)

## Fichier impacté

**`src/pages/InterviewStart.tsx`** — suppression des lignes 721-754 (la Card conversation + le transcript live).

Le bouton "Envoyer ma réponse" reste fonctionnel — la logique de `liveTranscript` et `candidateTranscriptRef` continue de fonctionner en arrière-plan même sans affichage visuel.

