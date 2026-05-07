# Vue "Cartes" pour analyser et décider entre les candidats

## Objectif

Ajouter une nouvelle vue **Cartes** sur la page projet (`/projects/:id`) à côté de la vue Tableau actuelle, optimisée pour visualiser et trier rapidement les candidats avec leur vidéo intégrée et les actions de décision à portée de clic.

## Toggle de vue

Au-dessus de la liste des sessions, un sélecteur :

```text
[ 📋 Tableau ]  [ 🃏 Cartes ]
```

Choix persisté en `localStorage` (`projectView:<id>`). La vue Tableau reste inchangée. Tous les filtres existants (recherche, statut, score, recommandation, sélection, période, assignation) s'appliquent aussi à la vue Cartes.

## Anatomie d'une carte

Grille responsive : 1 colonne mobile, 2 cols tablette, 3 cols desktop.

```text
┌──────────────────────────────────┐
│ Marie Dupont          ⭐ 82/100 │
│ marie@exemple.com    Frt. recom.│
├──────────────────────────────────┤
│                                  │
│        ▶  [VIDEO PLAYER]         │
│                                  │
│    Q2 — « Parlez-moi de … »      │
│                                  │
│  [◀ Préc.]    2 / 5    [Suiv. ▶] │
├──────────────────────────────────┤
│ [✓ Présélectionner]              │
│ [? 2e avis]      [✗ Rejeter]     │
└──────────────────────────────────┘
```

### 1. En-tête — Identité + Note IA
- **Prénom / Nom** en gras, email en sous-ligne
- **Note IA** (ex: `82/100`) sous forme de pastille colorée (vert ≥75, orange ≥55, rouge sinon) — `reports.overall_score`
- **Badge recommandation** IA (Fortement recommandé / Recommandé / À étudier / Non retenu) — `reports.recommendation`

### 2. Vidéo intégrée — Navigation par question
- Lecteur vidéo natif HTML5 affichant le segment de la question courante (`session_messages.video_segment_url` filtré sur les messages `role = 'candidate'` avec une vidéo)
- Au-dessus du lecteur : **label de la question** (« Q2 — texte tronqué »)
- En-dessous : boutons **`◀ Précédent`** / compteur **`2 / 5`** / **`Suivant ▶`** pour naviguer entre les questions sans quitter la carte
- Auto-play du segment au changement de question (silencieux si non interactif)
- Réutilise la logique du composant `SessionVideoNavigator` déjà existant — on l'extrait/embarque dans la carte
- Si aucune vidéo (statut non terminé, audio uniquement) : placeholder « Aucune vidéo disponible »

### 3. Actions de décision — 3 boutons
Trois boutons rapides en bas de carte qui mettent à jour `recruiter_decision` immédiatement :
- **✓ Présélectionner** (vert / `success`)
- **? 2ᵉ avis** (orange / `warning`)
- **✗ Rejeter** (rouge / `destructive`)

Le bouton actif (décision actuelle) est rempli avec la couleur, les autres en `outline`. Re-cliquer le bouton actif réinitialise à `none`. Réutilise le helper `updateDecision()` déjà câblé dans `ProjectDetail`.

## État vide / chargement

- **Aucun candidat ne correspond aux filtres** → message « Aucun candidat ne correspond à vos filtres » avec bouton « Réinitialiser »
- **Session non terminée** → carte affichée avec badge de statut (En attente / En cours…) et zone vidéo grisée
- **Pagination** : même logique que la vue Tableau (`PAGE_SIZE = 20`, boutons « Charger plus »)

## Détails techniques

- **Nouveau composant** : `src/components/project/SessionCard.tsx`
  - Props : `session`, `report`, `messages` (chargés à la demande), `onDecisionChange`
  - Charge les `session_messages` (vidéos par question) via un hook quand la carte est visible (lazy) — ou en batch au niveau parent
- **Nouveau composant** : `src/components/project/SessionsCardGrid.tsx`
  - Reçoit la liste filtrée de sessions, les rapports, et délègue le rendu à `SessionCard`
- **Modif** `src/pages/ProjectDetail.tsx` :
  - Nouveau state `view: "table" | "cards"` (persisté localStorage)
  - Toggle ShadCN `Tabs` ou `ToggleGroup` au-dessus du tableau
  - Pré-charge les `session_messages` (segments vidéo + question_id) en une seule requête pour toutes les sessions terminées du projet, indexés par `session_id` puis passés aux cartes
- **Aucune migration BDD** : tous les champs existent déjà (`reports.overall_score`, `reports.recommendation`, `session_messages.video_segment_url`, `session_messages.question_id`, `sessions.recruiter_decision`)
- **Pas de modif** des vues détail / rapport candidat
