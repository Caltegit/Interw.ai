## Retravailler le haut de la vignette (format tableau)

Fichier : `src/components/project/SessionCard.tsx`

### Changements

1. **En-tête restructuré** (lignes 211–235)
   - Bandeau plein largeur en haut de la carte avec bordure inférieure légère.
   - Prénom + nom centrés horizontalement, en gras.
   - Suppression de l'e-mail (`session.candidate_email`).
   - Badge de recommandation (Mitigé, Favorable, etc.) centré sous le nom.
   - Note IA déplacée : conserver le pavé coloré carré, mais le centrer (au-dessus ou en dessous du nom — proposition : pavé note centré en haut, puis nom centré, puis badge centré, le tout dans un bloc centré). À valider visuellement après essai ; sinon on inverse.

2. **Effet survol sur toute la vignette** (ligne 208)
   - Ajouter à `<Card>` : `transition-colors hover:bg-muted/50 cursor-pointer` pour griser au survol.

### Disposition cible (ASCII)

```text
+--------------------------------+
|             [ 62 ]             |
|         Mahaut Tourriol        |
|            [Mitigé]            |
+--------------------------------+
| (vidéo + contrôles inchangés)  |
| (boutons décision inchangés)   |
+--------------------------------+
```

### Hors scope
- Aucune modification de la vidéo, du sélecteur de question, des boutons -10s/+10s, ni des boutons de décision.
- Aucune modification de logique métier.