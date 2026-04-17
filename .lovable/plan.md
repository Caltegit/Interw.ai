

## Refonte UX entretien — Layout vertical une colonne

### Concept

Passer du layout actuel (2 colonnes : recruteur + candidat côte à côte) à un layout vertical centré une colonne, avec hiérarchie visuelle forte sur le recruteur IA.

### Structure proposée (de haut en bas)

```text
┌─────────────────────────────────────────────┐
│  Header compact                             │
│  Q 2/5 · [Sauvegarde…] · [Quitter]          │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │     AVATAR / VIDÉO RECRUTEUR        │   │
│   │     (taille x2, ~480px de haut)     │   │
│   │     "L'IA pose la question…"        │   │
│   │                                     │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   Question affichée en dessous (texte/      │
│   media player selon type)                  │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  Bandeau état (À vous / Écoute /…)  │   │
│   └─────────────────────────────────────┘   │
│                                             │
│   [✓ Ma réponse est finie]  ← bouton CTA   │
│                                             │
│   Live transcript (gris, italique)          │
│                                             │
├─────────────────────────────────────────────┤
│  Footer : retour vidéo candidat (PIP)       │
│  ┌────┐  🔴 Caméra active                   │
│  │ 📹 │  [👁 Masquer]                       │
│  └────┘  140×100px, coin bas-gauche        │
└─────────────────────────────────────────────┘
```

### Détails

**1. Bloc recruteur (focus principal)**
- Avatar/vidéo IA agrandi : ~2× la taille actuelle (≈480px sur desktop, plein largeur card sur mobile).
- Animation pulse subtile quand `isSpeaking`.
- Question affichée juste en dessous (QuestionMediaPlayer existant, variant featured).

**2. Zone interaction candidat (au milieu, sous la question)**
- Bandeau d'état (déjà refondu) : "🎙️ À vous !" / "Écoute en cours…" / etc.
- Bouton "✓ Ma réponse est finie" centré, large (h-12, px-8).
- Live transcript en dessous, gris italique, max-h scrollable.

**3. Retour vidéo candidat (PIP en bas)**
- Mini-vidéo 140×100px ancrée en `position: fixed bottom-4 left-4`.
- Bord arrondi `rounded-xl`, ombre `shadow-2xl`, bordure `border-2 border-emerald-500/40` quand caméra OK.
- Indicateur "🔴 REC" en overlay coin haut-droit de la PIP.
- Bouton œil discret pour masquer/afficher (état persistant pendant la session via `useState`).
- Sur mobile (<640px) : encore plus petit (100×75px) ou option masquage par défaut.

### Avantages UX

- **Focus sur le recruteur IA** : agrandir donne du poids au "présentateur" et rend l'expérience plus humaine (comme un vrai entretien face-à-face).
- **Flux naturel de lecture** : œil descend de l'IA → question → action → confirmation visuelle (PIP).
- **Moins de distraction** : le candidat ne voit plus son visage en permanence dans son champ de vision direct.
- **Mobile-friendly** : layout vertical s'adapte naturellement, pas besoin de réorganiser.

### Détails techniques

- `src/pages/InterviewStart.tsx` : refonte du JSX principal (zone des 2 colonnes actuelles → 1 colonne).
- Conserver tous les `useRef` vidéo, le `MediaRecorder`, la logique de reconnaissance vocale — uniquement le layout change.
- Ajouter un state `showSelfView` (default `true`) avec bouton toggle.
- PIP en `fixed` pour rester visible au scroll ; z-index élevé.

### Hors scope

- Pas de changement de la logique d'enregistrement vidéo / upload background.
- Pas de changement du flux de questions / IA.
- Pas de modif de l'écran de vérif technique (preview reste en grand là-bas).

