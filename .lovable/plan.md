## Objectif

Rendre `InterviewDeviceTest.tsx` plus lisible, mettre la caméra en petit, et corriger la mesure réseau qui reste bloquée alors que le débit est correct.

## Changements

### 1. Caméra en vignette (au lieu du grand aperçu)

- Remplacer le bloc `aspect-video` pleine largeur par une miniature ronde `w-28 h-28` (effet miroir conservé).
- Posée à gauche d'un bandeau d'en-tête contenant : prénom du candidat, statut caméra (point vert/ambre/rouge + libellé court), petit bouton « Changer » qui ouvre le `DeviceSelector` dans un Popover.
- Si la caméra est refusée/absente : la vignette devient un bouton « Activer la caméra » (icône + fond ambré), pas d'écran noir.

### 2. Liste verticale lisible (au lieu de 5 cartes empilées)

Sous le bandeau, une seule colonne avec 4 lignes compactes :

```text
●  Micro et enregistrement       OK
●  Son                            À tester  [Tester]
●  Reconnaissance vocale          Limitée
●  Connexion                      Stable
```

- Chaque ligne : pastille colorée (statut), libellé, badge à droite, action inline si besoin (bouton « Tester », « Réessayer »).
- Détails masqués par défaut (jauge micro, sélecteur d'appareil, message d'erreur). Une ligne s'ouvre automatiquement si `error` ou `warning`, sinon elle reste fermée.
- Plus d'accordéon décoratif : juste un chevron quand il y a quelque chose à montrer.
- Barre de progression en haut passe à 4 segments (Micro, Son, Voix, Connexion). La caméra n'est plus un segment puisqu'elle est visible en permanence dans le bandeau.

### 3. Mesure réseau fiabilisée

Problème actuel : le test télécharge une charge trop petite, le résultat est très variable et reste souvent en `testing` ou `weak` malgré une bonne connexion.

Corrections dans `testNetwork` (fichier `InterviewDeviceTest.tsx`) :

- Charge plus grande et stable : télécharger 2 fois (en parallèle) un asset déjà servi par l'app (`/placeholder.svg` répété, ou un fetch `Range: bytes=0-204799` vers un asset Supabase Storage public déjà existant) pour viser ~200 Ko utiles.
- Garder le meilleur des deux essais (évite qu'un pic ponctuel fausse tout).
- Timeout global 4 s : au-delà, on considère le test « ok » par défaut au lieu de rester bloqué (mieux vaut un faux positif qu'un blocage injustifié).
- Nouveaux seuils plus tolérants :
  - `good`    : ≥ 800 kb/s
  - `limited` : 250–800 kb/s
  - `weak`    : < 250 kb/s
- Affichage : quand `good`, on n'affiche que « Connexion stable » sans le chiffre exact (le chiffre apparaît au survol via tooltip). Quand `limited`/`weak`, on garde l'indication chiffrée + conseil.
- Si `navigator.connection.effectiveType` vaut `4g` et qu'on n'a pas pu mesurer, on considère directement `good` (pas d'écran d'erreur à tort).

### 4. CTA

- Garde le bouton « Commencer la session » sticky en bas, avec `backdrop-blur`.
- Désactivé uniquement si erreur bloquante (caméra/micro refusés). Les warnings réseau ne bloquent plus.

## Fichier touché

- `src/pages/InterviewDeviceTest.tsx` uniquement (refonte du JSX + correction `testNetwork`).
- Pas de nouveau composant, pas de modif BDD, pas de modif route, pas de modif `deviceDiagnostics.ts`.

## Hors scope

- Pas de Sheet d'aide, pas de confettis, pas de tour interactif (proposés au tour précédent, on simplifie).
- Pas de changement sur `useNetworkQuality.ts` (utilisé en cours de session, pas sur la page test).
