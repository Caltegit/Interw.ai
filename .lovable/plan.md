

## Retour vidéo candidat : repositionnement intelligent

### Problème

Le PIP `fixed bottom-3 left-3` chevauche la barre d'avancement et les boutons « Arrêter » / « Pause » du footer, surtout sur mobile et écrans moyens.

### Solution retenue — PIP intégré à droite du footer

Au lieu de flotter par-dessus le contenu, le retour vidéo s'intègre dans la barre du bas, à droite, en miniature. Plus aucun chevauchement, et la vidéo reste toujours visible sans gêner la lecture.

**Disposition du footer :**

```
┌────────────────────────────────────────────────────────────┐
│  Question 3/5   ███████████░░░░░░░  60%        ┌────────┐ │
│  [Arrêter l'entretien]   [Mettre en pause]     │ 📹 REC │ │
│                                                 └────────┘ │
└────────────────────────────────────────────────────────────┘
```

- Le PIP devient un élément flex à droite du footer (hauteur ≈ 72 px, largeur auto 16:9).
- Plus de `position: fixed`, plus de `z-50` qui passe par-dessus.
- Bouton « masquer » (œil barré) en overlay coin haut-droit du PIP.
- Si masqué : remplacement par un petit bouton « Afficher ma vidéo » au même emplacement, même gabarit — le footer ne saute pas.

### Comportement responsive

- **Mobile (< 640 px)** : PIP plus petit (≈ 56 × 96 px), footer reste sur 2 lignes (progression au-dessus, boutons + PIP en dessous, PIP aligné à droite).
- **Desktop** : PIP 72 × 128 px, aligné verticalement avec les boutons d'action.

### Indicateur REC

Conservé en overlay sur le PIP (badge rouge pulsé en haut-droit). Pas de texte « REC » sur mobile pour gagner de la place — juste le point rouge animé.

### Fichier touché

- `src/pages/InterviewStart.tsx` — section ~2116-2230 :
  - Suppression du bloc `fixed bottom-3 left-3 z-50`.
  - Intégration du PIP comme dernier enfant flex du footer (`<div className="border-t ...">`), avec un wrapper `flex items-center justify-between`.
  - Ajustement des classes responsive du footer pour conserver l'alignement existant des boutons centrés tout en plaçant le PIP à droite (utilisation d'un grid 3-colonnes : spacer / actions centrées / PIP).

### Hors champ

- Aucun changement BDD.
- Pas de modification du flux de capture ni de l'enregistrement vidéo (seul le rendu visuel du retour bouge).
- Pas de changement sur l'écran de test caméra/micro en amont.

