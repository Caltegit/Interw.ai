# Publier le correctif « 130 / 130 candidats »

## Ce qui sera publié
Le correctif frontend déjà en place :
- `src/pages/ProjectDetail.tsx` : chargement des rapports via jointure sur `project_id` (fini l'URL de 29 000 caractères et l'erreur 400).
- `src/hooks/queries/useDashboardData.ts` : compteur du tableau de bord aligné sur les sessions ayant un rapport.

Aucune modification de base de données, aucune écriture, aucune migration.

## Failles de sécurité
Sur ta demande, les 4 alertes critiques préexistantes (invitations lisibles par des anonymes, champs sensibles des organisations, médias modifiables inter-organisations) seront marquées comme ignorées pour débloquer la publication. Elles seront consignées dans la mémoire de sécurité afin de rester traçables et d'être traitées dans un chantier dédié.

Point important : ces failles restent réelles et exploitables une fois le site en ligne. Je recommande de planifier leur correction juste après.

## Étapes
1. Marquer les 4 alertes critiques comme ignorées avec la justification « publication demandée, correction planifiée ».
2. Mettre à jour la mémoire de sécurité.
3. Publier sur https://interw.ai.
