# Plan : option « Mettre l'intro en premier écran »

Ajouter une option dans l'onglet **Info** de la création / édition de session, qui permet d'afficher l'intro candidat (texte / audio / vidéo / TTS) **avant** le formulaire d'inscription au lieu d'après.

## Comportement utilisateur

**Onglet Info (création / édition d'une session) :**
- Nouveau toggle « Mettre l'intro en premier écran », placé juste sous « Autoriser le candidat à passer une question »
- Description : « Affiche l'intro candidat (si elle existe) avant le formulaire d'inscription. »
- Désactivé par défaut → comportement actuel inchangé (intro après le formulaire)

**Côté candidat (page d'arrivée `/session/:slug`) :**
- Si l'option est activée **et** qu'une intro est configurée : la page affiche d'abord l'écran d'intro (lecture audio/vidéo/TTS ou affichage texte), puis le formulaire d'inscription
- Si l'option est désactivée : comportement actuel (formulaire d'abord, intro entre le submit et l'écran de test média)
- Si aucune intro n'est configurée : le toggle n'a aucun effet, le formulaire s'affiche comme aujourd'hui

## Détails techniques

### Migration

Ajouter une colonne sur `projects` :
```sql
ALTER TABLE public.projects
ADD COLUMN intro_first_screen boolean NOT NULL DEFAULT false;
```

### `src/components/project/ProjectForm.tsx`
- Ajouter `introFirstScreen: boolean` dans `ProjectFormState`
- Ajouter le state local + l'inclure dans le payload `onSubmit`
- Ajouter le `<Switch>` dans l'onglet Info, sous l'option « passer la question »

### `src/pages/ProjectNew.tsx` & `src/pages/ProjectEdit.tsx`
- Inclure `intro_first_screen: s.introFirstScreen` dans l'insert / update `projects`
- Charger la valeur depuis le projet pour pré-remplir le formulaire en édition (défaut `false`)

### `src/pages/InterviewLanding.tsx`
- Au chargement du projet : si `intro_first_screen === true` et qu'une intro existe, basculer immédiatement sur l'écran d'intro (`showIntroMedia`) **sans** créer encore de session
- Ajouter un nouvel état pour distinguer les deux modes (intro avant vs intro après formulaire)
- Quand l'intro de pré-formulaire est terminée → afficher le formulaire d'inscription
- À la soumission du formulaire dans ce mode : créer la session puis aller directement à `/session/:slug/test/:token` (l'intro a déjà été vue)

## Hors scope
- Pas de changement sur la page de test média ni sur l'entretien lui-même
- Pas de modification de la logique de fallback (auto-détection du mode intro selon ce qui est configuré)
