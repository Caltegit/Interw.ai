# Passer tout l'indigo/violet en noir

Objectif : supprimer l'indigo/violet de l'interface. Boutons, états actifs, overlays, dégradés et le logo « Interw » passent en noir (et gris pour les nuances).

## Ce qui change visuellement

- **Boutons principaux** (app, landing, parcours candidat) : fond noir, texte blanc, survol gris très foncé.
- **États actifs / sélection** (sidebar, onglets, filtres, focus, anneaux) : noir au lieu d'indigo.
- **Overlays et halos** (glow de fond, dégradés radiaux, barres de progression, meter micro) : passage à des noirs/gris translucides au lieu de violet.
- **Logo et mot « Interw »** : dégradé indigo→violet remplacé par du noir plein.
- **Textes en dégradé** (`landing-gradient-text`, `candidate-gradient-text`) : noir uni ou dégradé noir→gris foncé.
- **Pastilles / badges accentués** : fond gris clair, texte noir.

Les couleurs fonctionnelles restent inchangées : vert succès, orange avertissement, rouge erreur, bleu info, ainsi que les scores et graphiques.

## Détails techniques

Modification centralisée dans `src/index.css` :

- Tokens app (clair et sombre) : `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` → noir (`0 0% 8%`) en clair, blanc/gris très clair en thème sombre pour rester lisible.
- Tokens landing (`.landing-root`) : `--l-accent`, `--l-accent-strong`, `--l-accent-soft` → noir / noir profond / gris très clair.
- Tokens candidat (`.candidate-layout`) : `--l-accent`, `--l-accent-2` → noir et gris foncé (le dégradé devient un dégradé de noirs).
- Les règles utilisant déjà `hsl(var(--l-accent))` (boutons, glow, gradient text, mic meter, progress) héritent automatiquement.

Valeurs violettes écrites en dur dans les composants (à remplacer par les tokens) :
`src/pages/Produit.tsx`, `Landing.tsx`, `Privacy.tsx`, `Legal.tsx`, `InterviewStart.tsx`, `InterviewComplete.tsx`, `InterviewDemoEnd.tsx`, `src/components/CandidateLayout.tsx`, `src/components/interview/QuestionMediaPlayer.tsx`, `InterviewBootProgress.tsx`, `FullscreenPrompt.tsx`, `AudioUnlockOverlay.tsx` — notamment le carré de logo `linear-gradient(135deg, hsl(243 75% 60%), hsl(290 70% 60%))` qui devient noir.

## Vérification

Contrôle visuel via captures d'écran : landing, page Produit, tableau de bord, détail projet, rapport de session, et parcours candidat (accueil, test matériel, entretien).
