# Plan — N'afficher QUE `hint_text` à côté de l'avatar / vidéo

## Règle (confirmée)

Pendant la question, à droite de la photo / vidéo côté candidat, le **seul** texte visible est celui saisi dans le champ « Texte affiché au candidat pendant sa réponse » (`questions.hint_text`).

- **Aucun fallback sur `content`.** Si `hint_text` est vide → aucun bloc texte n'est affiché.
- Aucune pastille 💡, aucune carte « texte de secours », aucun doublon.
- `content` reste utilisé en interne comme script TTS / prompt IA (zéro changement backend).

## Modifications

### 1. `src/components/interview/QuestionMediaPlayer.tsx`
- Ajouter une prop `displayText?: string | null`.
- Calculer `shownText = displayText?.trim() || ""` (pas de fallback sur `content`).
- Pour la variante `featured` :
  - Vidéo : aucun changement (le bloc texte vit dans `InterviewStart`, pas ici).
  - Écrit : afficher `shownText` à la place de `content`. Si vide, ne pas rendre le bloc texte.
  - Audio : afficher `shownText` au-dessus du player. Si vide, ne pas rendre le bloc texte (player seul).
- Variante `inline` : idem, remplacer `content` par `shownText` et masquer le `<p>` si vide.

### 2. `src/pages/InterviewStart.tsx`
- Aux deux appels `<QuestionMediaPlayer …/>` (vidéo ~3955, audio/écrit ~4080), ajouter `displayText={currentQ?.hint_text}`.
- **Supprimer** la carte « texte de secours » lignes ~4099-4109 (qui affiche `currentQ.content` sous la vidéo).
- **Supprimer** la pastille 💡 lignes ~4134-4142 (qui affiche `currentQ.hint_text` en doublon).
- Résultat : pour une question vidéo, le seul texte de la colonne droite est rendu par `QuestionMediaPlayer` à partir de `hint_text` ; si `hint_text` est vide, la colonne droite n'a plus de bloc texte du tout.

### 3. Aucune migration BDD, aucun changement edge function, aucun changement de formulaire d'édition.

## Vérification

1. Recharger l'entretien du projet `53c69e5e-…`.
2. Pour chaque question (vidéo / audio / écrite) : le seul texte visible à droite est exactement la valeur du champ « Texte affiché au candidat pendant sa réponse ».
3. Vider `hint_text` sur une question test → aucun bloc texte n'apparaît (player seul, ou avatar seul).
4. Plus aucune occurrence de `currentQ.content` rendue visible côté candidat.

## Hors scope

- Pas de renommage de colonne BDD.
- Pas de changement du TTS / prompt IA.
- Pas de modification des formulaires RH.
