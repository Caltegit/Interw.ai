## En-tête vignette plus compact

Fichier : `src/components/project/SessionCard.tsx` (lignes 210–233)

### Nouvelle disposition

```text
+--------------------------------+
|        Mahaut Tourriol         |
|     [62 NOTE IA] · [Mitigé]    |
+--------------------------------+
```

### Changements

1. **Nom en haut**, centré, `text-base font-semibold`, lien vers la session.
2. **Ligne unique en dessous** : pastille note + badge recommandation, centrés, `gap-2`.
3. **Pastille note compacte horizontale** : remplacer le carré 14×14 par une puce arrondie en ligne — fond coloré (`scoreColor`), `rounded-full px-2 py-0.5`, contenu inline « **62**  NOTE IA » (chiffre `font-bold`, label `text-[9px] uppercase tracking-wide opacity-90`).
4. **Suppression** de l'encadré avec bordure interne (`rounded-lg border bg-card p-3`) — on garde juste un `flex flex-col items-center gap-1` directement dans la carte pour gagner de la place.
5. Conserver `hover:bg-muted/50` sur la `Card`.

### Hors scope
Pas de modification vidéo / sélecteur / boutons décision.