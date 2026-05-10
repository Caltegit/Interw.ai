## Page Comparaison — 4 colonnes côte à côte

Refonte de `src/pages/ProjectCompare.tsx` pour afficher **jusqu'à 4 colonnes candidats côte à côte**, chacune reprenant exactement le format de la vue tableau du projet, complétée par une note recruteur et une synthèse du rapport.

### Accès

- Action **« Comparer »** ajoutée au menu **Actions** de `BulkActionsBar` (ProjectDetail).
- Active uniquement quand 2 à 4 candidats sont sélectionnés. Au-delà : option désactivée avec libellé « Maximum 4 ».
- Navigation vers `/projects/:id/compare?ids=id1,id2,id3,id4`.

### Structure d'une colonne

Chaque colonne = `Card` autonome scrollable indépendamment. De haut en bas :

```text
┌────────────────────────────┐
│ 1. Bloc « SessionCard »    │  ← réutilise <SessionCard/> tel quel
│    - Nom + Note IA + reco  │     (vidéo, navigation questions,
│    - Lecteur vidéo         │      boutons Retenu/À discuter/Non)
│    - Boutons décision      │
├────────────────────────────┤
│ 2. Note recruteur          │  ← <Textarea/> persistée
│    [zone de texte libre]   │     dans sessions.recruiter_note
├────────────────────────────┤
│ 3. Synthèse rapport        │
│    - Verdict (1 phrase)    │
│    - Points forts (3 max)  │
│    - Points de vigilance   │
│    - Red flags si présents │
├────────────────────────────┤
│ 4. Scores par critère      │
│    Liste compacte :        │
│    Critère ────── 8/10 ▰▰▰ │
│    + surlignage du meilleur│
│      score de la ligne     │
├────────────────────────────┤
│ 5. Soft skills (chips)     │
├────────────────────────────┤
│ 6. Lien « Voir le rapport »│
└────────────────────────────┘
```

### En-tête de page

- Titre « Comparaison » + nom du projet
- Bouton retour
- Petit récap : « N candidats comparés · Meilleur score : X% »
- Croix sur chaque colonne pour retirer un candidat (re-écrit l'URL)

### Surlignage cross-colonnes

Pour chaque ligne comparable (score global, chaque critère, recommandation), la **meilleure valeur est mise en évidence** : fond `bg-success/10` + petite icône trophée. Permet de scanner visuellement.

### Note recruteur

- Champ texte libre par candidat, sauvegarde auto (debounce 800 ms) dans `sessions.recruiter_note`.
- Si la colonne `recruiter_note` n'existe pas, migration ajoutant `text NULL` sur `sessions`.

### Responsive

- ≥ `xl` (1280 px) : 4 colonnes égales
- `lg` : 3 colonnes, scroll horizontal pour la 4ᵉ
- `md` : 2 colonnes
- mobile : 1 colonne, swipe horizontal entre candidats (snap)

### Détails techniques

- Réutilisation de `<SessionCard>` sans modification (props existantes).
- Données : un seul fetch `sessions` + `reports` filtré sur `id IN (...)`.
- `recruiter_note` : nouvelle colonne `text` sur `sessions` (RLS héritée des policies existantes).
- Pas de nouveau composant lourd : juste un `CompareColumn` qui empile les blocs et un `useDebouncedSave` pour la note.

### Hors scope

- Export PDF
- Comparaison entre projets différents
- Édition des décisions en bulk (chaque colonne garde ses 3 boutons)
