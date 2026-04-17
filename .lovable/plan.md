

## Raccourci clavier "barre d'espace" pour valider la réponse

### Comportement
Dans l'interface candidat (`src/pages/InterviewStart.tsx`), permettre la validation de la réponse via la touche **Espace** du clavier, en plus du bouton existant.

### Détails techniques

**1. Listener clavier global**
- Ajouter un `useEffect` qui attache un `keydown` sur `window`
- Condition de déclenchement (mêmes conditions que le bouton "Ma réponse est terminée") :
  - `e.code === "Space"`
  - L'entretien est actif (pas en pause, pas terminé, pas en train de parler côté IA)
  - Le bouton "Terminé" est actuellement actif (voix détectée / réponse en cours) — mêmes conditions que `hasVoice` côté UI
  - La cible n'est pas un champ de saisie (`<input>`, `<textarea>`, `contentEditable`) — sécurité
- `e.preventDefault()` pour éviter le scroll de la page
- Appelle la même fonction que le bouton (probablement `handleAnswerComplete` ou équivalent)
- Cleanup : retirer le listener au démontage

**2. Texte d'aide sous le bouton**
- Sous le bouton **"Ma réponse est terminée"**, ajouter une ligne :
  - Texte : *"ou appuyer sur la barre d'espace du clavier"*
  - Style : petit, discret, crème atténué (cohérent charte Morning) — ex `text-xs text-[#f5f0e8]/50 mt-2 text-center`
- Affiché uniquement quand le bouton est visible (pas pendant la pause, pas pendant que l'IA parle)

### Fichier touché
- `src/pages/InterviewStart.tsx` — 1 `useEffect` (listener) + 1 ligne de texte sous le bouton CTA

