## Problème

Dans le sélecteur de questions sous la vidéo du rapport candidat (et dans le sélecteur équivalent de la vue tableau d'un projet), la liste affiche actuellement le **contenu interne** (`questions.content`) au lieu du **« Texte affiché au candidat pendant sa réponse »** (`questions.hint_text`) saisi dans le formulaire de question.

C'est pour ça qu'on voit dans la capture des libellés comme « Tu penses quoi de Morning ? » (contenu interne) à côté de « Parcours pro » (titre interne) — deux champs différents mélangés.

## Règle d'affichage demandée

Pour chaque entrée de la liste : afficher `question.hint_text` (le texte que le candidat voyait pendant qu'il répondait).

Repli si `hint_text` est vide :
1. `question.title` (titre interne)
2. sinon `question.content`

Format : `Question N — <hint_text|title|content>`.

## Modifications

### 1. `src/hooks/queries/useSessionDetail.ts`
- Ajouter `hint_text` au select des questions du projet (ligne ~17) : `questions(id, content, order_index, title, hint_text)`.

### 2. `src/components/session/SessionReportView.tsx`
- Étendre l'objet `SessionVideoClip` mappé (ligne 171-179) avec `questionHint: projectQ?.hint_text ?? null`.
- Utiliser ce champ dans le rendu de la transcription (ligne 617) avec le repli décrit.

### 3. `src/components/session/SessionVideoNavigator.tsx`
- Ajouter `questionHint?: string | null` à l'interface `SessionVideoClip` (ligne 13-21).
- Dans le dropdown (ligne 819-831), afficher `c.questionHint || c.questionTitle || c.questionText`.
- Mettre à jour aussi le fallback ligne 615 (overlay d'erreur média) avec la même règle, pour cohérence.

### 4. `src/components/project/SessionCard.tsx`
- Étendre l'interface `Question` (ligne 16-21) avec `hint_text?: string | null`.
- Dans le dropdown (ligne 248-250), afficher `q.hint_text || q.title || q.content`.
- Le composant parent `ProjectDetail.tsx` charge déjà `hint_text` (ligne 282) — aucune modification de requête nécessaire ici.

## Hors périmètre

- Pas de changement sur l'overlay « titre » sous le player vidéo (`questionTitle`) — il reste un libellé court par design.
- Pas de modification du modèle de données ni des requêtes côté projet.
- Aucune modification visuelle hors de ce texte.
