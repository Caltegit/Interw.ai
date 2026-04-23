

## Bandeau d'enregistrement candidat — version discrète

### Problème

Pendant l'entretien, le composant `RecordingStatusBadge` est positionné en haut et provoque un re-layout/clignotement de tout l'écran à chaque changement d'état (recording on/off, upload en cours). En plus, c'est visuellement trop présent pour le candidat.

### Correctif

**1. Repositionner le badge en bas à droite, en overlay fixe**

Le composant existe déjà (`src/components/interview/RecordingStatusBadge.tsx`) et est en réalité **déjà positionné `fixed bottom-4 right-4`**. Le bandeau blanc qui clignote n'est donc pas lui — c'est probablement une instance dupliquée ou un autre indicateur dans `InterviewStart.tsx`. À vérifier en lecture du fichier mais le correctif final sera :

- Garder un seul indicateur, en bas à droite, **petit point coloré** + tooltip au survol (au lieu d'un badge avec texte).
- Supprimer toute version "bandeau" en haut de l'écran.

**2. Supprimer le clignotement**

- Remplacer le rendu conditionnel `if (!recording && pendingUploads === 0) return null;` par un rendu permanent avec opacité animée → pas de mount/unmount, pas de reflow.
- Utiliser `transition-opacity duration-300` pour les changements d'état.
- Indicateur réduit à un **pastille 8px** colorée (rouge pulsé = enregistrement, ambre = sauvegarde, vert = OK) en bas à droite, sans texte.
- Texte accessible via `aria-label` + `title` (tooltip natif au survol) pour rester accessible sans pollution visuelle.

**3. Vérifier qu'il n'y a pas d'autre bandeau**

Lire `InterviewStart.tsx` pour identifier d'éventuels autres bandeaux d'état (FullscreenPrompt, etc.) qui s'afficheraient en haut pendant l'enregistrement, et les rendre tout aussi discrets ou les retirer du flux d'enregistrement.

### Fichiers touchés

- `src/components/interview/RecordingStatusBadge.tsx` — passe en pastille discrète bas-droite, sans clignotement.
- `src/pages/InterviewStart.tsx` — retirer toute autre bannière d'enregistrement en haut si présente.

### Hors champ

- Refonte du `FullscreenPrompt` (déjà discret en haut, utile, à garder).
- Changement du système de sauvegarde lui-même.

