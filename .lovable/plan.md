

## Application Option 1 — Doré Morning

Application des tons doré Morning sur la zone vu-mètre + bouton CTA dans `src/pages/InterviewStart.tsx`.

### Changements

**Container vu-mètre + bouton (wrapper unifié)**
- Fond : `bg-[#262626]` (au lieu de `bg-stone-900/60`)
- Bordure : `border-[#d4a574]/20` (au lieu de `border-amber-500/20`)

**Bouton actif (voix détectée)**
- Dégradé : `from-[#d4a574] to-[#c4955e] hover:from-[#c4955e] hover:to-[#b48650]`
- Texte : `text-[#1a1a1a]` (sombre pour contraste max sur doré)
- Halo : `shadow-lg shadow-[#d4a574]/40`
- Icône check : pastille `bg-[#1a1a1a]/15`
- Animation pulse conservée

**Bouton inactif (en attente de voix)**
- Fond : `bg-white/5`
- Texte : `text-[#f5f0e8]/50` (crème atténué)

### Fichier touché
- `src/pages/InterviewStart.tsx` — uniquement les classes du container et du bouton CTA (~6 lignes)

Aucune logique métier modifiée.

