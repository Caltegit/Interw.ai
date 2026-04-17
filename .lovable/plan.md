
## Réorganiser les questions en lignes dépliables

Transformer chaque carte de question en une ligne compacte « accordéon » : en mode replié on voit l'essentiel sur une ligne, en mode déplié on accède aux détails (type de média, enregistreur, relance IA).

### Comportement

**Ligne repliée (par défaut) :**
- Poignée de drag (⋮⋮) | Flèche ▶ | Badge type (Écrite / Audio / Vidéo avec icône) | Titre/aperçu de la question | Indicateur Relance IA (si actif) | Bouton supprimer
- Hauteur ~48px → on voit 6-8 questions d'un coup au lieu de 2-3

**Ligne dépliée :**
- Tout le contenu actuel : sélecteur de type, input, enregistreur audio/vidéo, toggle relance IA

**États par défaut :**
- Nouvelle question ajoutée (via "+ Ajouter") → ouverte automatiquement pour saisie immédiate
- Questions importées depuis la bibliothèque → repliées
- Questions existantes au chargement → repliées
- Click sur la flèche (ou la zone titre) → toggle ouvert/fermé
- État d'ouverture conservé en mémoire locale pendant la session d'édition

### Implémentation technique

Fichier modifié : `src/components/project/StepQuestions.tsx`

- Ajouter un `Set<string>` d'IDs ouverts dans `StepQuestions` (state local), passé à `SortableQuestion` avec `isOpen` + `onToggle`
- Dans `SortableQuestion` :
  - En-tête toujours visible (ligne compacte avec drag, chevron, badge type, aperçu titre, badge "Relance IA" optionnel, bouton trash)
  - Contenu actuel enveloppé dans un bloc conditionnel `{isOpen && (...)}`
  - Chevron : icône `ChevronRight` qui pivote en `ChevronDown` via classe `rotate-90`
- Aperçu titre = `q.content` tronqué, ou « Question sans titre » en italique muted si vide
- Badge type : petite pill colorée avec icône (Type / Mic / Video) — réutiliser les icônes déjà importées
- `addQuestion` et `handleLibrarySelect` : ajuster pour ouvrir auto la nouvelle question / laisser fermées celles importées

### Diagramme

```text
Replié :
┌────────────────────────────────────────────────────────┐
│ ⋮⋮  ▶  [🎤 Audio]  Parle-moi de ton parcours...   ↻  🗑 │
└────────────────────────────────────────────────────────┘

Déplié :
┌────────────────────────────────────────────────────────┐
│ ⋮⋮  ▼  [🎤 Audio]  Parle-moi de ton parcours...      🗑 │
│       Type: [Écrite] [Audio] [Vidéo]                   │
│       [Input texte titre...]                           │
│       [Enregistreur audio...]                          │
│       ◉ Relance IA                                     │
└────────────────────────────────────────────────────────┘
```

### Hors scope
- Pas d'« ouvrir tout / fermer tout » global (ajoutable plus tard si besoin)
- Pas de persistance de l'état ouvert/fermé entre rechargements de page
