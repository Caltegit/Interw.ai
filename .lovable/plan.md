

# Restaurer les fonctionnalités validées dans InterviewStart.tsx

## Problème
Les modifications validées (avatar remplacé par la vidéo, bouton centré) ne sont pas dans le code actuel. Probablement écrasées lors d'éditions ultérieures du fichier.

## Modifications (1 fichier : `src/pages/InterviewStart.tsx`)

### 1. Avatar conditionnel selon le type de question
- Déterminer le `questionType` de la question courante (written/audio/video)
- Si `video` : remplacer l'avatar IA par le `QuestionMediaPlayer` en mode featured (même cadre aspect-square, même ring, même badge nom IA)
- Si `written` ou `audio` : garder l'avatar IA tel quel

### 2. Supprimer le QuestionMediaPlayer featured de la colonne droite pour les vidéos
- Le bloc "Question en cours" (lignes 828-851) ne doit afficher le player featured que pour `written` et `audio`
- Pour `video`, le player est déjà dans la colonne gauche (à la place de l'avatar)

### 3. Bouton "Arrêter l'entretien" centré au-dessus des colonnes
- Déplacer le `Button` destructive + `PhoneOff` (ligne 917) en dehors du grid, centré horizontalement entre les 2 colonnes

## Résumé
Un seul fichier modifié avec 3 ajustements conditionnels dans le JSX de retour.

