

## Plan — Refonte UX du formulaire de question

Repenser `QuestionFormDialog` pour partir du **format** de la question (Texte / Audio / Vidéo), puis n'afficher que les champs pertinents pour ce format.

### Nouvelle structure du formulaire

**Étape 1 — Choix du format (en haut, visuel)**

3 grandes cartes cliquables côte à côte (radio visuel) :

```text
┌──────────┐ ┌──────────┐ ┌──────────┐
│  📝      │ │  🎤      │ │  🎥      │
│  Texte   │ │  Audio   │ │  Vidéo   │
│ Lu par IA│ │ Voix réelle│ │ Vous à l'écran│
└──────────┘ └──────────┘ └──────────┘
```

Sous les cartes, une phrase de contexte qui change selon le format choisi :
- Texte : « La question sera lue par la voix de l'IA du projet. »
- Audio : « Enregistrez votre voix. Aucun texte ne sera affiché au candidat. »
- Vidéo : « Filmez-vous en train de poser la question. Le texte n'est pas nécessaire. »

**Étape 2 — Contenu (adapté au format)**

| Format | Champs affichés |
|---|---|
| **Texte** | Titre interne (court) · Énoncé (textarea, lu par l'IA) · Catégorie |
| **Audio** | Titre interne · Enregistreur audio · Catégorie · *(Énoncé optionnel, replié sous « Ajouter un texte de secours »)* |
| **Vidéo** | Titre interne · Enregistreur vidéo · Catégorie · *(Énoncé optionnel, replié sous « Ajouter un texte de secours »)* |

Le « Titre interne » est expliqué par un placeholder : « Nom court visible uniquement par vous ».

**Étape 3 — Options pour le candidat (toujours visibles, regroupées)**

Carte « Pendant la réponse » :
- Indication affichée au candidat (`hint_text`) — avec une icône ampoule et un placeholder type « Pensez à donner un exemple concret ».
- Temps limite de réponse (`max_response_seconds`) — sélecteur rapide (Pas de limite / 1 min / 2 min / 3 min / 5 min / Personnalisé).

**Étape 4 — Relance IA (regroupée)**

Carte « Relance par l'IA » :
- Niveau de relance avec 3 options visuelles :
  - Aucune (l'IA passe à la suivante)
  - Légère (1 relance max)
  - Approfondie (2 relances max)
- Le compteur `max_follow_ups` est déduit automatiquement, plus de champ séparé.

**Étape 5 — Sauvegarde (en bas, discret)**

Case à cocher « Ajouter aussi à la bibliothèque » (uniquement à la création, pas à l'édition d'une question issue de la bibliothèque, comportement actuel conservé).

### Changements visuels

- Hauteur du dialogue stable : tout tient dans un `max-h-[85vh]` avec scroll interne, plus de saut de layout au changement de format.
- Sections séparées par de fines cartes (`rounded-lg border bg-muted/30 p-3`) avec un titre court — pas de gros headers.
- Boutons d'action en footer fixe : « Annuler » / « Enregistrer ».
- Suppression des labels redondants ; un seul libellé clair par champ.

### Fichiers touchés

- `src/components/QuestionFormDialog.tsx` — refonte complète du rendu, la structure de `QuestionFormValue` reste identique (aucune migration nécessaire).
- Aucune modification de `StepQuestions.tsx` ni de `QuestionLibraryManager.tsx` — ils consomment le même contrat `QuestionFormValue`.
- Aucune modification de base de données.

### Détails techniques

- Le sélecteur de format devient un `RadioGroup` stylé en cartes (réutilise `@/components/ui/radio-group`).
- La logique `relanceLevel` → `maxFollowUps` est centralisée dans le formulaire : `light=0`, `medium=1`, `deep=2`. Le champ numérique `maxFollowUps` disparaît de l'UI mais reste dans `QuestionFormValue` (calculé à la soumission) pour ne rien casser côté `StepQuestions`.
- Le champ « Énoncé » reste dans le state même pour Audio/Vidéo (replié), pour préserver la compatibilité avec les imports bibliothèque qui ont déjà un texte.
- Le sélecteur de durée propose des presets + un mode « Personnalisé » qui ouvre un petit input minutes/secondes.

### Hors champ

- Pas de changement sur l'enregistrement audio/vidéo lui-même (`QuestionMediaRecorder` réutilisé tel quel).
- Pas de changement sur la bibliothèque ni sur le schéma de données.
- Pas de wizard multi-étapes — tout reste dans un seul dialogue, juste mieux organisé.

