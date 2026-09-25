# Matrice Fit grise sur les fiches candidats

## Constat vérifié
- Les données sont bonnes : les rapports récents du projet contiennent bien des cases notées (ex. 22 à 32 cases sur 36).
- Le rendu gris vient donc de l'affichage dans la fiche candidat, pas du calcul IA.

## Étape 1 — Reproduire et localiser
Ouvrir une fiche candidat récente dans l'aperçu et identifier pourquoi les cases notées s'affichent grises :
- soit la matrice n'arrive pas jusqu'au composant (donnée perdue en chemin),
- soit les cases sont lues comme « non évaluées » à tort (clé ou format inattendu),
- soit un style récent écrase les couleurs.

## Étape 2 — Corriger au plus petit
Correction ciblée sur le seul point fautif trouvé, sans toucher au calcul, à la base ni au parcours candidat.

## Impact
- Candidat : aucun effet.
- Recruteur : la matrice retrouve ses couleurs ; aucune note ne change.
- Build : risque très faible, correction d'affichage uniquement.

## Vérification
Test E2E candidat puis recruteur (actuellement bloqués par le module de configuration manquant, déjà connu), plus contrôle direct d'une fiche : cases colorées selon la note, « — » gris uniquement pour les vraies cases non évaluées.
