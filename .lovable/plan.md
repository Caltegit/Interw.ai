

# Zone fixe "Question en cours" + Bulles enrichies dans l'historique

## Objectif
Améliorer l'interface candidat pour distinguer visuellement les questions texte, audio et vidéo avec deux composants combinés :
1. Une **zone fixe** au-dessus du chat affichant la question courante en grand format avec lecteur média intégré
2. Des **bulles enrichies** dans l'historique permettant de réécouter/revoir les médias

## Modifications

### 1. Zone fixe "Question en cours" (dans InterviewStart.tsx)
Ajout d'un bandeau entre la barre de progression et la conversation :
- **Question texte** : Affichage grand format avec icône 📝, texte en citation stylisée
- **Question audio** : Icône 🎤 + bouton play/pause avec barre de progression animée (waveform simplifiée)
- **Question vidéo** : Lecteur vidéo inline compact avec contrôles play/pause, dans un cadre arrondi
- Indicateur du type de question (badge "Texte" / "Audio" / "Vidéo")
- Bouton rejouer pour audio/vidéo

### 2. Bulles enrichies dans l'historique
Modifier le rendu des messages AI dans la liste `messages` :
- Stocker le type de média et l'URL associée dans chaque message (`mediaType`, `mediaUrl`)
- **Bulle texte** : Style actuel amélioré avec icône de citation
- **Bulle audio** : Mini lecteur audio inline (bouton play + durée)
- **Bulle vidéo** : Thumbnail vidéo cliquable qui lance la lecture inline

### 3. Nouveau composant `QuestionMediaPlayer.tsx`
Composant réutilisable pour la lecture des médias de question :
- Props : `type` ("written" | "audio" | "video"), `content` (texte), `audioUrl`, `videoUrl`, `variant` ("featured" | "inline")
- `featured` = zone fixe grande, `inline` = bulle compacte dans l'historique
- Gestion play/pause, barre de progression pour audio

### 4. Adaptation du state `messages`
Étendre le type des messages pour inclure les infos média :
```text
{ role: string; content: string; mediaType?: string; mediaUrl?: string }
```
Quand l'IA pose une nouvelle question, on attache le `mediaType` et `mediaUrl` de la question correspondante.

### Fichiers impactés

| Fichier | Modification |
|---|---|
| `src/components/interview/QuestionMediaPlayer.tsx` | Nouveau — lecteur média réutilisable (featured + inline) |
| `src/pages/InterviewStart.tsx` | Zone fixe question en cours + bulles enrichies + state étendu |

### Étapes
1. Créer `QuestionMediaPlayer` avec les deux variantes (featured/inline)
2. Modifier `InterviewStart` : étendre le type messages, ajouter la zone fixe, enrichir les bulles

