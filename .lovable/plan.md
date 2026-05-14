## Objectif

Dans la vignette `SessionCard` (vue Cartes) :
1. Remonter légèrement le menu déroulant de décision (réduire l'espacement au-dessus).
2. Ajouter, **juste sous** le sélecteur, un champ « Note recruteur » sur **toute la largeur**, sur **une seule ligne** (input simple, pas un textarea), avec sauvegarde auto-debounced — même comportement que dans la vue Tableau.

## Comportement

- Le sélecteur de décision reste centré, mais avec moins de padding au-dessus (`pt-1` au lieu de `pt-2`, et plus de `mt-auto` puisque la note prend le bas).
- Sous le sélecteur : un `Input` shadcn pleine largeur, hauteur compacte (`h-8`), placeholder « Ajouter une note… ».
- Sauvegarde auto au bout de ~1s d'inactivité (réutilise la logique `saveNote` déjà présente dans `ProjectDetail.tsx`).
- Si aucun rapport n'est encore généré pour la session : input désactivé avec tooltip « Note disponible une fois le rapport généré » (cohérent avec la vue tableau).
- La note reste collée en bas de la carte (`mt-auto` déplacé sur le conteneur décision+note).

## Détails techniques

### `src/components/project/SessionCard.tsx`

- Ajouter au type `Props` :
  ```ts
  noteValue?: string;
  noteSaving?: boolean;
  onNoteChange?: (sessionId: string, value: string) => void;
  hasReport?: boolean;
  ```
- Importer `Input` depuis `@/components/ui/input`.
- Remplacer le bloc actuel `{/* Décision */}` par :
  ```tsx
  <div className="mt-auto flex flex-col gap-2 pt-1">
    <div className="flex justify-center">
      <Tooltip>…Select de décision inchangé…</Tooltip>
    </div>
    {onNoteChange && (
      hasReport ? (
        <div className="flex items-center gap-1">
          <Input
            value={noteValue ?? ""}
            onChange={(e) => onNoteChange(session.id, e.target.value)}
            placeholder="Ajouter une note…"
            className="h-8 text-xs"
          />
          {noteSaving && <span className="text-xs text-muted-foreground">…</span>}
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Input disabled placeholder="Pas de rapport" className="h-8 text-xs" />
          </TooltipTrigger>
          <TooltipContent>Note disponible une fois le rapport généré</TooltipContent>
        </Tooltip>
      )
    )}
  </div>
  ```

### `src/pages/ProjectDetail.tsx`

Au rendu des `SessionCard` (vue cartes, ligne ~767) ajouter les nouvelles props :
```tsx
<SessionCard
  …existing props…
  noteValue={noteDrafts[s.id]}
  noteSaving={!!savingNote[s.id]}
  onNoteChange={saveNote}
  hasReport={!!reportsBySession[s.id]}
/>
```

### Hors scope
- Vue Tableau : inchangée.
- Aucun changement backend.

## Vérification
- Vue Cartes : le sélecteur de décision est légèrement plus haut, le champ note apparaît dessous, pleine largeur, sur une ligne.
- Saisie d'une note → sauvegarde après ~1s, persistance après reload.
- Session sans rapport → input désactivé avec tooltip explicatif.
