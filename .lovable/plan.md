# Traduire la vidéo de la landing en anglais

## Contexte

La vidéo de la landing (`/demo-interwai-hd.mp4`) est **rendue depuis Remotion** (`remotion-landing/`), puis exportée en MP4/WebM statique dans `public/`. Elle est muette (pas de voix-off) : tout le contenu à traduire est du **texte à l'écran**, en dur en français dans 5 fichiers de scènes.

Fichources sources concernés :
- `remotion-landing/src/DemoVideo.tsx` — composition racine, reçoit `transparent`
- `remotion-landing/src/scenes/demo/SceneProblem.tsx`
- `remotion-landing/src/scenes/demo/SceneDefinition.tsx`
- `remotion-landing/src/scenes/demo/SceneInterview.tsx`
- `remotion-landing/src/scenes/demo/SceneEvaluation.tsx`
- `remotion-landing/src/scenes/demo/SceneProfiles.tsx`
- `remotion-landing/src/Root.tsx` — déclare la composition `demo`
- `remotion-landing/scripts/render-remotion.mjs` — rendu vers MP4
- `src/pages/Landing.tsx` — `DemoVideo()` sert en dur `/demo-interwai-hd.mp4`

## Ce qu'il y a à traduire (inventaire)

Texte à l'écran actuellement en français :
- **SceneProblem** : « Des heures d'entretiens… », « …alors qu'il vous suffit de 5 minutes par candidat. », « Semaine du 27 avril », « 25 entretiens », jours « Lun 27 / Mar 28 / Mer 29 / Jeu 30 / Ven 1er »
- **SceneDefinition** : « Vous définissez l'entretien. », « Vos critères, vos questions — posées par vous. », « Intitulé du poste », « Questions enregistrées », questions (« Parlez-moi de votre parcours. »…), « Enregistrement · 00:0X », « Critères de sélection », critères (« Technique », « Communication », « Autonomie »)
- **SceneInterview** : « Le candidat répond face caméra. », « Quand il veut, où il veut. », « Question 3 / 4 », « Qu'est-ce qui vous attire dans ce poste ? », étapes (« Présentation », « Parcours », « Motivation », « Mise en situation »), « Enregistrement · … »
- **SceneEvaluation** : « Interw analyse les réponses selon vos critères. », « Les mêmes critères pour tous. », « Scores par critère », « Observations IA », critères (« Expérience produit », « Fit culturel »…), observations (« A illustré son propos… », « Réponses structurées… », « Aligné avec les valeurs… »)
- **SceneProfiles** : « Vous choisissez les candidats les plus adaptés. », « Ceux que vous allez rencontrer. », badges (« Recommandé », « À considérer », « Réserve »), « 24:20 d'entretien », « 3 min à regarder », « Chaque score est justifié par des extraits de l'entretien. »

Les **noms de candidats** (Clément A., Thomas L., Sofia R.) restent neutres/génériques — inchangés.

## Approche

On paramètre les scènes par une prop `lang`, on rend une version EN, et la landing choisit le bon fichier selon la langue active. On garde l'architecture statique (un MP4 par langue) — pas de Player Remotion live dans la landing (trop lourd).

### Étape 1 — Module de copy bilingue

Créer `remotion-landing/src/i18n/demo-copy.ts` exportant un objet `COPY = { fr: {...}, en: {...} }` contenant toutes les chaînes listées ci-dessus. Chaque scène récupère ses chaînes via ce module indexé par `lang`.

### Étape 2 — Prop `lang` dans les scènes

- `DemoVideo` reçoit `lang: "fr" | "en"` (en plus de `transparent`) et le propage aux 5 scènes.
- Chaque scène remplace ses littéraux français par `COPY[lang].xxx`.
- `Root.tsx` : la composition `demo` garde `defaultProps={{ lang: "fr" }}`. On ne crée **pas** de seconde composition — le rendu EN se fait via `inputProps` au moment du render.

### Étape 3 — Rendu de la version EN

Adapter `render-remotion.mjs` pour accepter un `--lang` et passer `inputProps={{ lang }}` à `selectComposition`. Exécuter le rendu EN vers :
- `public/demo-interwai-hd-en.mp4`
- `public/demo-interwai-hd-en.webm`
- `public/demo-interwai-poster-en.png` (poster localisé, sinon le poster FR reste affiché au chargement)

Le rendu FR existant n'est pas regénéré (inchangé).

### Étape 4 — Sélection côté landing

Dans `src/pages/Landing.tsx`, `DemoVideo()` lit `i18n.language` (via `useTranslation`) et choisit :
- `lang === "en"` → `demo-interwai-hd-en.mp4` (+ webm + poster-en)
- sinon → `demo-interwai-hd.mp4` (+ webm + poster)

Le reste du composant (IntersectionObserver, auto-play, ordre des `<source>`) est inchangé.

## Ce qu'on ne fait pas

- On ne touche pas à `MainVideo` ni aux voiceover (tutoriel, pas la landing).
- On ne garde pas les noms FR localisés (Clément/Thomas/Sofia restent tels quels).
- On n'ajoute pas de Player Remotion live dans la landing.
- On ne modifie pas la copy FR existante (les fichiers FR servent le MP4 FR actuel).
