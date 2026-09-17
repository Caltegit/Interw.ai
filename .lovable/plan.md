# Graphique d'évolution Interw — semaine par semaine

Un graphique à télécharger (image), pas de changement dans l'application.

## Contenu

Trois courbes hebdomadaires depuis la création d'Interw :

1. Organisations créées (bêta-testeurs) — cumul
2. Entretiens terminés et analysés (rapport généré) — par semaine et cumul
3. Candidats recrutés (décision « Accepté ») — cumul

Chiffres actuels déjà vérifiés en base : 43 organisations, 846 entretiens analysés, 20 candidats acceptés.

## Détails techniques

- Données lues en lecture seule : `organizations.created_at`, `sessions.completed_at` joint à `reports`, `sessions.recruiter_decision = 'accepted'` avec `recruiter_decision_at`.
- Sessions de démonstration exclues (`is_demo = false`).
- Regroupement par semaine (lundi), de la première semaine d'activité à aujourd'hui.
- Image générée avec Python/matplotlib, enregistrée dans Fichiers (format PNG haute résolution), plus un fichier de données si utile.

## Impact

Aucun risque : aucune ligne de code de l'application modifiée, aucune migration, aucune écriture en base. Rien ne change pour les recruteurs ni pour les candidats.

## Tests après approbation

Pas de test E2E nécessaire (aucun changement applicatif). Vérification faite sur l'image : totaux de fin de courbe identiques aux chiffres de la base (43 / 846 / 20).
