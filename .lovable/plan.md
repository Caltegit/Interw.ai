## Objectif

Produire une vidéo démo de 20 s du produit Interw.ai (1920×1080, 30 fps) cohérente avec la vidéo tuto existante (fond sombre `#0F0F10`, accent doré `#d4a574`, Inter), puis l'intégrer dans une nouvelle page `/demo` du site, sur le même modèle que la page admin `AdminTuto`.

## Direction artistique

- Palette : `#0F0F10` (fond), `#16161A` / `#1C1C22` (surfaces), `#F5F0E8` (texte), `#d4a574` (accent), `#4ade80` (success ponctuel)
- Typo : Inter (déjà chargée dans `MainVideo`)
- Motion system : entrées en `spring({ damping: 18 })`, transitions `fade()` et `slide()` de `@remotion/transitions` — exactement comme la vidéo tuto
- Réutilisation : `BrowserChrome`, `BackgroundLayer` existants

## Structure (6 scènes, 600 frames @ 30 fps)

| # | Scène | Durée | Idée visuelle | Texte |
|---|---|---|---|---|
| 1 | Problème | 90 f (3 s) | Calendrier surchargé, blocs d'entretiens empilés qui scintillent | « Des heures d'entretiens… » → « …pour peu de bons candidats. » |
| 2 | Solution | 90 f (3 s) | Transition vers `BrowserChrome` propre — dashboard Interw.ai épuré | « Interw.ai automatise vos premiers entretiens. » |
| 3 | Entretien IA | 120 f (4 s) | UI chat/visio : avatar Marie + bulles de questions qui apparaissent en cascade, candidat qui répond | « L'IA interroge chaque candidat à votre place. » |
| 4 | Évaluation | 120 f (4 s) | Critères pondérés + barres de score qui se remplissent (réutilise le pattern de `SceneStep3`) | « Analyse les réponses selon vos critères. » |
| 5 | Résultat | 90 f (3 s) | Carte rapport candidat : score global, forces / faiblesses, badge shortlist | « Identifie les meilleurs profils. » |
| 6 | Impact + CTA | 90 f (3 s) | Liste top candidats + chiffre clé « 3× moins de temps » + logo Interw.ai | « 3× moins de temps. De meilleurs recrutements. » + pill « interw.ai » |

Total brut : 600 f − 5×15 f de transitions = **525 f ≈ 17,5 s utiles** → on garde `durationInFrames: 600` pour atteindre 20 s pile.

Transitions : `fade()` entre 1↔2 et 5↔6, `slide({ direction: 'from-right' })` entre 2↔3, 3↔4, 4↔5.

## Fichiers à créer

```
remotion/src/
  DemoVideo.tsx                     # nouveau MainVideo de la démo
  scenes/demo/
    SceneProblem.tsx
    SceneSolution.tsx
    SceneAIInterview.tsx
    SceneEvaluation.tsx
    SceneResult.tsx
    SceneImpact.tsx
  Root.tsx                          # ajout d'une 2e <Composition id="demo" />
```

Aucun voiceover (le brief le dit explicitement).

## Rendu

Script existant `remotion/scripts/render-remotion.mjs` adapté pour accepter l'ID de composition, puis :
```
node scripts/render-remotion.mjs demo /mnt/documents/interw-demo-20s.mp4
```

## Intégration dans le site

Une fois le MP4 rendu, je l'upload dans le bucket Storage `tutorials` (déjà utilisé pour `tutoriel-creation-session.mp4`) sous le nom `demo-produit-20s.mp4`, puis :

1. Création de `src/pages/Demo.tsx` — calquée sur `AdminTuto.tsx` mais publique :
   - titre « Découvrez Interw.ai en 20 secondes »
   - lecteur vidéo avec **autoplay muet au scroll** + bouton « Activer le son » (même pattern que `TutoVideo` du Landing)
   - bouton « Demander une démo » qui ouvre le `DemoRequestDialog` existant
2. Ajout de la route `/demo` dans `src/App.tsx` (publique, hors `ProtectedRoute`)
3. Ajout d'un lien « Voir la démo » dans la nav du `Landing` pointant vers `/demo`

## Livrables

- `/mnt/documents/interw-demo-20s.mp4` téléchargeable
- Code source versionné sous `remotion/src/scenes/demo/`
- Page publique `/demo` avec lecture auto + CTA démo