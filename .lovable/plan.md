# Simplification des cartouches tarifaires

Retouche de la section tarifs de `src/pages/Landing.tsx` : retirer les éléments redondants, raccourcir la note et remplacer l'animation de prix par un effet « roulette » chiffre par chiffre.

## Ce qui est retiré

- La phrase descriptive sous le nom de chaque plan (« Payez uniquement les entretiens… », etc.) — le bloc nom + description disparaît, seul le nom du plan reste.
- La mention « Sans carte bancaire » sous le bouton de chaque cartouche.
- La pastille « Sans carte bancaire » dans le bandeau « 10 entretiens offerts » au-dessus des cartes (le bandeau garde uniquement « 10 entretiens offerts »).
- Les lignes de caractéristiques « Postes actifs simultanés » et « Utilisateurs » (identiques sur les 4 cartes : « Illimités »). Il reste donc par cartouche : « Entretiens inclus / mois » et « Au-delà ».
- La note sous le basculeur devient « Prix HT. Sans engagement. » (on supprime « changez de plan quand vous voulez. »).

## Animation « roulette » sur les prix

Objectif : au clic sur Mensuel / Annuel, seuls les chiffres qui changent bougent, comme une machine à sous.

- Les prix sont affichés chiffre par chiffre (chaque chiffre dans son propre span, de largeur fixe `ch` pour ne pas décaler la mise en page).
- Au changement de période, un chiffre dont la valeur ne change pas reste immobile ; un chiffre qui change défile verticalement (l'ancien chiffre sort vers le haut, le nouveau arrive par le bas, ~300 ms, courbe douce).
- Exemple Plus 199 → 169 : le « 1 » reste fixe, « 9 → 6 » et « 9 → 9 »... le « 9 » des dizaines devient « 6 » donc il tourne, et les unités « 9 → 9 » restent fixes car identiques. Pro 399 → 329 : « 3 » fixe, « 9 → 3 » et « 9 → 9 » tournent selon le même principe.
- La cartouche « À la carte » (0 €) et « Entreprise » (Sur devis) ne bougent jamais : prix identique dans les deux périodes, aucune animation.
- L'animation actuelle `price-roll` (fondu global du prix entier) est supprimée au profit de cette mécanique chiffre par chiffre.

## Fichiers touchés

- `src/pages/Landing.tsx` : suppression des blocs retirés, nouveau composant de prix animé (`RollingPrice`) local au fichier, note raccourcie.
- `src/i18n/locales/fr/pricing.json` et `src/i18n/locales/en/pricing.json` : suppression des clés devenues inutilisées (`plans.*.desc`, `noCard` n'est plus utilisé dans les cartes ni le bandeau, `specs.activeRoles`, `specs.users`), mise à jour de `note`.
- `src/index.css` : retrait de la keyframe `price-roll`, ajout des keyframes de défilement vertical si nécessaire (sinon transitions CSS inline).

## Vérification

- Build OK, capture d'écran de la section tarifs en mensuel et annuel (FR + EN) pour confirmer : hauteurs de cartes alignées, plus de textes retirés, animation visible au basculement.
