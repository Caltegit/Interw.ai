## Objectif
Restructurer la barre d'onglets du rapport de session (Résumé / Fit Poste / Orale / Attitude / Big Five / Texte) en une présentation verticale plus grande et plus lisible, avec un onglet actif nettement plus visible.

## Changements (un seul fichier)

**`src/components/session/SessionReportView.tsx`** (lignes 275-306, le bloc `tabsList`)

1. **Layout vertical par onglet** : remplacer le contenu `gap-1.5` horizontal de chaque `<TabsTrigger>` par un `flex flex-col items-center justify-center gap-1`, avec :
   - L'icône Lucide (`LayoutDashboard`, `Target`, `Mic`, `User`, `Brain`, `ScrollText`) en haut, taille passée à `h-5 w-5`.
   - Le libellé au milieu (`Résumé`, `Fit Poste`, …) avec `text-sm font-medium`.
   - La pastille de note (`FitScoreBadge`, `ParaverbalBadge`, `NonverbalBadge`, `BigFiveBadge`) en bas. Onglets sans note (Résumé, Texte) : pas de pastille.
   - Conserver la classe responsive `hidden sm:inline` (ou équivalente) sur le libellé pour ne pas casser l'affichage compact quand le copilote est ouvert.

2. **Hauteur +50%** : `<TabsList>` passe de `h-14` à `h-20`. Chaque `<TabsTrigger>` passe de `h-12` à `h-[72px]` avec `py-2`.

3. **Onglet actif plus visible** : ajouter sur chaque `<TabsTrigger>` une classe `data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-primary/30 data-[state=active]:font-semibold transition-colors`. Cela renforce le contraste de l'onglet sélectionné par rapport au style shadcn par défaut (fond blanc discret).

4. **Pas de changement de logique** ni de modification des badges eux-mêmes — on garde `size={32}`.

## Vérification
Recharger `/sessions/...`, vérifier :
- L'onglet sélectionné est nettement différencié (couleur primaire + ring + ombre).
- Pictos / libellé / note empilés verticalement et centrés sur chaque onglet.
- La barre est sensiblement plus haute, sans débordement responsive.
- Capture d'écran preview pour confirmer visuellement avant publication.
