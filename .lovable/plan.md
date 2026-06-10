# Plan — Afficher uniquement `hint_text` à droite de l'avatar/vidéo

## Diagnostic

Le champ « Texte affiché au candidat pendant sa réponse » est bien enregistré dans `questions.hint_text` (vérifié en BDD). Mais sur l'écran candidat (`src/pages/InterviewStart.tsx` + `src/components/interview/QuestionMediaPlayer.tsx`), le texte affiché en grand à côté de l'avatar / vidéo est `currentQ.content` (titre court / script IA), pas `hint_text`. `hint_text` n'apparaît que dans une petite pastille 💡 en dessous.

## Règle cible

Pendant la question, à droite de la photo / vidéo, **un seul texte** est visible : `hint_text`.
- Fallback sur `content` uniquement si `hint_text` est vide (anciennes questions).
- Aucune autre carte texte, aucune pastille 💡, aucun doublon.
- Le `content` reste utilisé tel quel comme script TTS / prompt IA (aucun changement backend).

## Modifications

### 1. `src/components/interview/QuestionMediaPlayer.tsx`
- Ajouter une prop `displayText?: string | null`.
- Calculer `shownText = displayText?.trim() || content`.
- Remplacer les 5 occurrences `{content}` rendues à l'utilisateur (lignes ~336, 343, 402, 410, 453) par `{shownText}`.

### 2. `src/pages/InterviewStart.tsx`
- Aux deux appels `<QuestionMediaPlayer …/>` (vidéo ~3955, audio/written ~4080), passer `displayText={currentQ?.hint_text}`.
- Supprimer la carte "texte de secours" sous la vidéo (~lignes 4100-4109) qui affiche `currentQ.content` (devient redondante / contradictoire).
- Supprimer la pastille 💡 (~lignes 4135-4142) qui affiche `currentQ.hint_text` (le texte est désormais dans le bloc principal).

### 3. Aucune migration BDD, aucun changement edge function

## Vérification

1. Recharger l'entretien du projet en cours.
2. Pour chaque question (vidéo/audio/écrite) : à droite de l'avatar/vidéo, **seul** le `hint_text` doit s'afficher, en gros.
3. Plus aucune pastille 💡 ni carte secondaire avec le `content`.
4. Question sans `hint_text` (legacy) → fallback sur `content`.

## Hors scope

- Pas de renommage de colonne BDD.
- Pas de changement du TTS / prompt IA.
- Pas de modification des formulaires d'édition.
