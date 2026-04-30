## Objectif

Sur mobile, le retour vidéo du candidat est positionné à droite (3ᵉ colonne d'une grille `1fr_auto_1fr`) et déborde/devient invisible. Le centrer sous les actions sur mobile, conserver le placement à droite à partir de tablette.

## Modification

Fichier : `src/pages/InterviewStart.tsx` (lignes 3080–3158)

Remplacer la grille 3-colonnes systématique par un layout empilé (flex-col) sur mobile et grille 3-colonnes à partir de `sm`.

```tsx
// Conteneur
<div className="flex flex-col items-center gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
  {/* Spacer gauche, masqué sur mobile */}
  <div className="hidden sm:block" />
  {/* Actions centrées (inchangé) */}
  <div className="flex items-center gap-2 justify-center"> ... </div>
  {/* Retour vidéo : centré sur mobile, à droite sur sm+ */}
  <div className="flex justify-center sm:justify-end items-center"> ... </div>
</div>
```

Sur mobile, l'ordre DOM (actions au-dessus, vidéo en-dessous) est conservé et tout reste centré et visible.
