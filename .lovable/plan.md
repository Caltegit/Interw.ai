

## Plan — Allègement de la page Détail Projet

### Constat

La page actuelle est surchargée :
- En-tête à 2 lignes avec 6 boutons (Lien candidat, Dupliquer, Comparer, Sauver template, Modifier, Supprimer)
- Carte de filtres **toujours visible** avec 8 contrôles (recherche, statut, reco, score min, score max, date début, date fin, tri)
- Onglet "Aperçu" qui répète des infos déjà visibles ailleurs
- Bandeau "candidats en attente" volumineux qui duplique la liste

### Modifications dans `src/pages/ProjectDetail.tsx`

**1. En-tête condensé (1 seule ligne)**

```
[Titre projet]  [Badge statut]                    [🔗 Lien] [✏ Modifier] [⋯ Plus ▾]
```

- Garder visibles : **Lien candidat**, **Modifier**
- Regrouper dans un menu déroulant **« Plus »** (DropdownMenu) :
  - Dupliquer
  - Sauvegarder comme modèle
  - Comparer les candidats (si ≥2 sessions terminées)
  - Supprimer (en rouge, en bas)
- Suppression du sous-titre redondant

**2. Onglet « Aperçu » supprimé**

Les infos (description, langue, persona, durée, lien) sont déplacées :
- **Lien candidat** : déjà accessible via bouton "Lien" en en-tête
- **Description / persona / durée / langue** : affichées dans une petite carte compacte **au-dessus de la liste des sessions** uniquement si l'utilisateur clique sur **« Détails du projet ▾ »** (Collapsible replié par défaut)

L'onglet par défaut devient directement **Sessions**.

**3. Filtres masqués derrière un lien**

Comportement demandé :
- Au-dessus de la liste : ligne unique avec
  - Champ de **recherche** (toujours visible — usage le plus fréquent)
  - Lien texte **« Filtres »** (icône `SlidersHorizontal`) avec compteur si filtres actifs : `Filtres (2)`
  - Lien texte **« Trier : Date (récent) ▾ »** (Select compact)
  - Compteur résultats à droite : `12 / 45`
- Clic sur **« Filtres »** → ouvre un **Popover** (ou Sheet sur mobile) contenant :
  - Statut
  - Recommandation
  - Score min / max (sur une ligne)
  - Date début / fin (sur une ligne)
  - Bouton **« Réinitialiser »** en bas
- Si aucun filtre actif, le Popover s'ouvre vide ; sinon les valeurs sont préremplies

**4. Bandeau « candidats en attente » allégé**

Au lieu d'une grande carte qui liste chaque candidat en attente (déjà présents dans le tableau ci-dessous), remplacer par une **alerte fine d'une ligne** :

```
⚠ 3 candidats en attente — [Voir uniquement les en attente]
```

Le lien applique automatiquement `statusFilter = "pending"`. Suppression de la liste dupliquée.

**5. Colonnes du tableau sessions allégées**

- Fusionner **Candidat + Email** en une seule colonne (nom en gras, email en petit gris dessous) → libère ~20% de largeur
- Masquer **Note recruteur** sous `lg` (déjà longue, accessible en cliquant sur la ligne)
- Action **Supprimer** : icône seule (déjà OK), action **Voir** : retirer le bouton (la ligne est déjà cliquable pour les terminés)
- Action **Relancer** sur les `pending` : garder

### Architecture visuelle après refonte

```text
Titre projet  [Actif]                    [🔗 Lien] [✏ Modifier] [⋯ ▾]
▸ Détails du projet

[ Sessions (12) ]  [ Questions (5) ]  [ Critères (4) ]

⚠ 3 candidats en attente — Voir uniquement les en attente

[🔍 Rechercher…]   [⚙ Filtres (2)]   [↕ Date (récent) ▾]        12 / 45

┌──────────────────┬────────┬───────┬──────┬──────────┬────────────┐
│ Candidat         │ Statut │ Score │ Reco │ Date     │   Actions  │
│  email           │        │       │      │          │            │
├──────────────────┼────────┼───────┼──────┼──────────┼────────────┤
│ Marie Dupont     │ ✓ Term │  8.2  │ Fav. │ 21/04/26 │   [🗑]     │
│  marie@x.com     │        │       │      │          │            │
└──────────────────┴────────┴───────┴──────┴──────────┴────────────┘
```

### Fichiers modifiés

- `src/pages/ProjectDetail.tsx` (seul fichier touché)
- Imports ajoutés : `DropdownMenu*`, `Popover*`, `Collapsible*`, `SlidersHorizontal`, `MoreHorizontal`, `ChevronDown`

### Hors scope

- Pas de changement de logique métier (filtres, tri, suppression fonctionnent à l'identique)
- Pas de nouvelle requête DB
- Pas de modif des onglets Questions / Critères

