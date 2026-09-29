# Résumé candidat : bilan en haut, roue resserrée, encarts redondants supprimés

## Objectif

Sur l'onglet Résumé d'une fiche candidat : le « Bilan global » doit être visible dès l'ouverture de la page, à la place des 4 encarts (Fit Poste / Orale / Attitude / Profil) supprimés car déjà affichés dans la barre d'onglets au-dessus. La roue « Profil Interw » est resserrée, sans grand espace vide autour.

Direction choisie par l'utilisateur (prototype v1 « Bilan à droite de la roue ») : deux cartes côte à côte — roue compacte à gauche, Bilan global en grande carte à droite.

## Ce qui change

1. **Suppression des 4 encarts de notes** (colonne de droite actuelle). Les 4 notes restent visibles dans la barre d'onglets, inchangée.
2. **Nouvelle disposition en deux cartes** :
   - À gauche : carte « Profil Interw » avec la roue (composant existant, taille ~280 px), badges Dominant/Secondaire et mention « profil net / hybride » conservés ; marges internes réduites pour supprimer le blanc autour du dessin.
   - À droite : carte « Bilan global » avec le texte de synthèse existant, hauteur alignée sur la roue.
3. **Ce qui suit ne bouge pas** : Signaux à creuser, Communication & posture, Soft skills, vidéos, et la grande roue de l'onglet Profil.
4. En dessous de l'écran large, les deux cartes s'empilent (roue puis bilan).

## Impact

- Affichage uniquement : aucun changement de données, calculs, scoring, rapports ni parcours candidat.
- Les 4 notes deviennent cliquables uniquement via la barre d'onglets (les encarts supprimés étaient aussi cliquables) — rien n'est perdu.
- Risque de casse faible ; points à surveiller : lisibilité des 8 noms autour de la roue resserrée, et l'empilement sur fenêtre étroite.
- Publication nécessaire pour interw.com ; d'ici là, visible dans l'aperçu.

## Détails techniques

- `src/components/session/SessionReportView.tsx` : onglet résumé — grille passe de `lg:grid-cols-[minmax(0,1fr)_280px]` (roue + colonne de 4 notes) à `lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]` (roue + Bilan global) ; la carte Bilan global remonte dans cette grille ; suppression du rendu vertical de `ScoresOverviewCard` dans cet onglet.
- `src/components/session/InterwProfilesWheel.tsx` : réduction des marges internes de la carte (le dessin occupe la place), taille du libellé ajustée si besoin pour rester lisible à 280 px.
- `src/components/session/ScoresOverviewCard.tsx` : le mode vertical n'est plus utilisé par le résumé ; conserver le mode horizontal utilisé ailleurs.

## Vérifications après modification

- Contrôle à l'écran sur une fiche récente (Diane de La Rivière, /sessions/950c016e) : Bilan global visible sans défiler dès l'ouverture, roue complète avec ses 8 noms, aucune erreur console.
- Contrôle sur une fenêtre plus étroite : empilement propre, pas de débordement.
- Test E2E candidat puis recruteur, conformément à la règle en vigueur (le problème de configuration des tests automatiques reste bloquant ; contrôle manuel à l'écran en attendant).
