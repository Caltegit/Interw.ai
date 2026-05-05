## Objectif

Refondre l'UX/UI de l'écran de test technique (`InterviewDeviceTest.tsx`) pour le rendre plus moderne, rassurant et engageant — sans changer la logique des tests (déjà fiabilisée au tour précédent).

## Constat actuel

- 5 cartes empilées identiques → impression « checklist administrative ».
- Le candidat doit scroller pour voir si tout est ok.
- L'aperçu caméra prend autant de place qu'une simple ligne de statut, alors que c'est l'élément le plus rassurant.
- Pas de progression visible : on ne sait pas combien de tests restent.
- Le bouton final « Commencer la session » n'est jamais sticky, on peut l'oublier.
- Couleurs très neutres (gris/blanc), peu d'identité.

## Proposition de refonte

### 1. Header avec progression

En haut, remplacer le titre simple par :
- **Titre** + **sous-titre** courts.
- **Barre de progression** segmentée (5 segments correspondant aux tests : Caméra, Micro, Son, Voix, Connexion). Chaque segment se remplit en vert/ambre/rouge selon son statut.
- Compteur discret à droite : « 4/5 vérifiés ».

```text
Vérification technique
Quelques secondes pour s'assurer que tout fonctionne.
[██████████ ██████████ ██████████ ░░░░░░░░ ██████████]   4/5
 Caméra      Micro       Son       Voix      Réseau
```

### 2. Hero caméra en haut

Remonter l'aperçu caméra **au-dessus** de tout, en grand format avec coins arrondis et ombre douce. C'est l'élément que le candidat regarde en premier (« est-ce que je suis bien cadré ? »).

- Aspect ratio 16:9, largeur pleine.
- Petit badge en surimpression : ✓ Caméra OK / ⚠ Caméra refusée.
- Sélecteur de caméra discret en overlay coin haut-droit (icône engrenage → menu).
- Effet « miroir » conservé.

### 3. Cartes compactes en grille 2 colonnes (desktop) / 1 colonne (mobile)

Sous la caméra, regrouper les 4 autres tests en cartes plus petites et symétriques :

```text
[ 🎤 Micro       OK ]   [ 🔊 Son        À tester ]
[ 💬 Voix    Limitée ]  [ 📶 Réseau     Bonne     ]
```

Chaque carte :
- Icône colorée (cercle plein avec teinte du statut).
- Nom du test.
- Badge de statut à droite (`Badge` shadcn).
- Quand on clique dessus → s'expand en accordéon pour montrer les détails (jauge micro, bouton tester son, sélecteur device, etc.).
- État replié par défaut quand le test est OK → désencombre la vue.
- État déplié auto si erreur ou warning → l'attention va dessus.

### 4. Carte « problème » prioritaire

Quand un test échoue, sa carte :
- Passe en pleine largeur.
- Bordure rouge/ambre.
- Reste dépliée.
- Affiche un CTA visible « Comment résoudre ? » qui ouvre un mini drawer/popover avec aide visuelle (capture d'écran simulée du cadenas du navigateur, par exemple).

### 5. Bandeau bilan plus discret

Le bandeau actuel « X problèmes à régler » devient :
- Petite ligne fixe en haut sous le header.
- Animation `slide-in` quand un nouveau problème apparaît.
- Disparaît tout seul quand tout est ok (avec un mini ✓ vert qui flash).

### 6. CTA sticky

Le bouton « Commencer la session » devient **sticky en bas de l'écran** sur mobile (toujours visible), avec un fond légèrement flouté (`backdrop-blur`).

États visuels :
- **Tous OK** → bouton plein indigo + petit éclair `Sparkles`.
- **Warnings seulement** → bouton plein avec libellé « Continuer (avec quelques limitations) ».
- **Erreurs bloquantes** → bouton désactivé + message court à côté.

### 7. Animations & micro-interactions

- Fade-in séquencé des cartes au mount (`stagger` 80 ms).
- Quand un test passe `testing → ok`, animation : icône tourne puis se transforme en check vert (Framer Motion ou simple CSS).
- Hover des cartes : très légère élévation (`shadow-md` → `shadow-lg`).
- Vibration légère du badge quand un statut change (mobile : `navigator.vibrate(20)`).

### 8. Identité visuelle plus forte

- Léger dégradé de fond derrière la zone caméra (`from-primary/5 to-transparent`).
- Pictos cohérents : tous Lucide, taille uniforme, fond circulaire `bg-{color}/10`.
- Typo : titre en `text-2xl font-bold tracking-tight`, sous-titre `text-sm text-muted-foreground`.
- Couleurs sémantiques uniquement (tokens du design system : `primary`, `emerald`, `amber`, `destructive`, `muted`).

### 9. Aide contextuelle « Besoin d'aide ? »

Petit lien discret en bas (avant le CTA) : « Besoin d'aide ? » → ouvre un Sheet/Drawer avec :
- Liste des problèmes courants par navigateur.
- Lien copier le lien pour ouvrir sur un autre appareil.
- Mention « L'entretien fonctionne sur Safari (iPhone) et Chrome (Android, Mac, PC). »

Évite de polluer la vue principale avec ces infos.

### 10. État final célébré

Quand `canContinue` devient `true` pour la première fois, mini animation :
- Confettis discrets ou simple `pulse` indigo autour du CTA.
- Texte du bouton change : « C'est parti → ».
- Auto-scroll doux jusqu'au CTA.

## Découpage technique

### Fichiers touchés

- **`src/pages/InterviewDeviceTest.tsx`** : refonte JSX complète, conserve toute la logique (handlers, state) déjà mise en place. Sépare en sous-composants internes pour garder le fichier lisible.
- **`src/components/interview/TestProgressBar.tsx`** *(nouveau)* : barre segmentée des 5 tests.
- **`src/components/interview/TestCheckCard.tsx`** *(nouveau)* : carte test compacte avec accordéon intégré, props `status`, `title`, `icon`, `expanded`, `children`, `onRetry`.
- **`src/components/interview/HelpSheet.tsx`** *(nouveau)* : Sheet shadcn avec aide contextuelle.
- **`src/components/interview/CameraHero.tsx`** *(nouveau)* : aperçu caméra grand format + badge statut + sélecteur en overlay.

### Aucun changement

- Pas de modif des handlers de test (`testMicAndRecorder`, `testCam`, `testSound`, `testStt`, `testNetwork`).
- Pas de modif des libs (`deviceDiagnostics.ts`).
- Pas de modif BDD ni edge functions.
- Pas de nouvelles dépendances : on réutilise `Sheet`, `Accordion`, `Badge` shadcn déjà présents.

## Hors scope (à proposer plus tard si tu veux)

- Tour de présentation interactif au premier passage (Driver.js ou onboarding maison).
- Export d'un rapport de diagnostic PDF en cas de problème persistant.
- Test vidéo de luminosité (« la pièce est-elle assez éclairée ? »).

## Question pour toi

Trois variantes possibles, dis-moi laquelle tu préfères :

- **A. Refonte complète** comme décrit ci-dessus (gros impact visuel, ~1 message).
- **B. Refonte progressive** : juste header avec progression + caméra hero + CTA sticky d'abord ; le reste en 2ᵉ tour.
- **C. Refonte minimale** : juste les cartes en grille 2 colonnes + accordéon + CTA sticky, sans toucher au header ni à la caméra.