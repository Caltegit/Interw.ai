

## Refonte du bouton "Ma réponse est finie"

Objectif : rendre le bouton de fin de réponse beaucoup plus visible, agréable et "premium", et harmoniser visuellement la zone vu-mètre + bouton qui est aujourd'hui un peu plate.

### Changements proposés (dans `src/pages/InterviewStart.tsx`, zone CTA principal lignes ~1080-1114)

**1. Bouton plus grand et plus "vivant"**
- Hauteur : `h-12` → `h-16` (même taille que le bouton "Lancer l'entretien" pour la cohérence)
- Texte : `text-sm sm:text-base` → `text-lg sm:text-xl` + `font-semibold`
- Coins arrondis : ajouter `rounded-2xl` (au lieu du `rounded-md` par défaut)
- Effet visuel quand actif (en écoute avec voix détectée) :
  - Dégradé vert : `bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700`
  - Ombre douce colorée : `shadow-lg shadow-emerald-500/30`
  - Légère animation pulse autour du bouton (halo) pour inviter au clic
  - Petit effet de scale au hover : `hover:scale-[1.02] transition-transform`
- Icône check dans un cercle blanc à gauche du texte (au lieu du simple "✓") pour un rendu plus pro :
  ```
  [○✓]  Ma réponse est terminée
  ```

**2. Vu-mètre micro mieux intégré**
- Aujourd'hui le vu-mètre est dans une "boîte" grise séparée → on l'enchâsse dans la même carte arrondie que le bouton, séparés par un fin divider, pour créer un seul bloc cohérent "je parle → je valide".
- Container unique : `rounded-2xl border border-border/50 bg-card/40 p-3` contenant micro + bouton.

**3. Texte d'aide plus discret**
- "Cliquez dès que vous avez terminé." → garder mais en plus petit (`text-[11px]`) et avec une icône souris/clic subtile, uniquement sur les 2 premières questions (déjà le cas).

**4. État "désactivé" plus clair**
- Quand l'utilisateur n'a pas encore parlé : bouton grisé avec texte "🎤 Parlez pour répondre…" au lieu d'être juste masqué — ça évite l'effet "rien ne s'affiche".

### Aperçu (texte)

```
┌─────────────────────────────────────────┐
│   🎤  ▁▃▅▇█▇▅▃▁▁▁▁▁▁▁▁                  │   ← vu-mètre
├─────────────────────────────────────────┤
│                                         │
│      ⊙✓   Ma réponse est terminée       │   ← bouton vert dégradé, h-16, halo
│                                         │
└─────────────────────────────────────────┘
        Cliquez dès que vous avez terminé.
```

### Fichier touché
- `src/pages/InterviewStart.tsx` (uniquement le bloc CTA, ~30 lignes)

Aucune logique métier modifiée, uniquement le style et le wording.

