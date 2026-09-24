# Profils Interw : radar à 8 axes dans la fiche candidat

## Objectif
Ajouter dans chaque fiche candidat un radar (style de ta 3e capture) notant indépendamment 8 profils de 0 à 100 % : Leader, Team player, Créatif, Exécutant fiable, Battant, Empathique, Adaptable, Analytique. C'est un éclairage supplémentaire : **il ne modifie pas le fit score**.

## Ce que verra le recruteur
**Emplacement (visible sans défiler) :**
- Onglet **Résumé** : la roue remplace les deux cartes Fit Poste et Orale (à gauche). Ces deux cartes passent à droite, empilées au-dessus d'Attitude et Perso (4 petites cartes en colonne à droite).
- Un bouton « i » sur la roue ouvre l'onglet **Profil**.
- L'onglet **Perso** est renommé **Profil** : il affiche la roue en grand, puis les explications détaillées des 8 profils (définition, ce qu'il dit à l'oral, forces, vigilance, postes cibles) et la règle de lecture (dominant, secondaire, net/hybride). Le Big Five actuel reste dans cet onglet, en dessous.

Contenu de la roue :
- roue colorée à 8 secteurs inspirée de ta première capture : chaque profil a sa propre couleur (ex. Leader rouge, Battant orange, Créatif jaune, Adaptable vert clair, Team player vert, Empathique turquoise, Analytique bleu, Exécutant fiable violet), en dégradé pastel du centre vers l'extérieur ;
- chaque secteur se remplit de sa couleur, plus intense selon le score (plus le score est haut, plus le secteur est plein et vif) ; le profil dominant est mis en avant par un arc épais coloré sur le bord extérieur, le secondaire par un arc plus fin ;
- noms des profils écrits en couleur autour de la roue, le logo Interw au centre ;
- moyenne du poste affichée en fin trait pointillé gris sur la roue ;
- en tête : **Dominant** (score le plus haut), **Secondaire** (2e), et la mention **Profil net** si l'écart dépasse 15 points, sinon **Profil hybride** ;
- au survol d'un axe : score, forces, points de vigilance, postes cibles ;
- sous le radar, pour le dominant et le secondaire : 1 à 2 citations cliquables qui renvoient au moment précis de la vidéo (même mécanisme que le Big Five).

Si la transcription est trop courte, les scores sont marqués « confiance faible ».

## Comment le score est calculé
Lors de la génération du rapport, l'IA reçoit la grille des 8 profils (définition, ce qu'il dit à l'oral, forces, vigilance) et note chaque profil sur la transcription complète, avec citations et niveau de confiance. Aucun total à 100 % : chaque profil est indépendant. Dominant / secondaire / net / hybride sont calculés par le code, pas par l'IA, pour rester exacts.

## Anciens candidats
Les nouveaux rapports auront le radar automatiquement. Pour les rapports existants, un bouton « Calculer les profils » dans la carte lance un calcul léger à partir de la transcription déjà enregistrée, sans régénérer le rapport ni toucher aux scores.

## Hors périmètre (étape suivante)
Les 3 questions orales qui discriminent ces profils : traité dans un plan séparé.

## Impact
- **Build** : aucun risque de casse attendu ; ajout d'une colonne facultative et d'un nouveau composant. La bibliothèque de graphiques est déjà installée.
- **Recruteur** : nouvelle carte uniquement. Fit score, matrice, recommandation, Big Five et vidéos inchangés. Sans données, la carte affiche le bouton de calcul au lieu de planter.
- **Candidat** : aucun changement dans l'entretien.
- **Génération des rapports** : le bloc profils est facultatif ; s'il échoue, le rapport est enregistré normalement (pas de rapport bloqué). Légère hausse du temps de génération (quelques secondes).
- **Coût IA** : un peu plus de texte par rapport ; calcul à la demande uniquement pour les anciens.

## Tests après approbation
1. E2E candidat : parcours de démonstration complet jusqu'à l'écran de fin.
2. E2E recruteur : ouverture d'une fiche avec rapport, présence du radar, dominant/secondaire corrects, et d'une fiche ancienne avec le bouton de calcul.

## Détails techniques
- Migration : `reports.interw_profiles jsonb` nullable (aucun GRANT nouveau, table existante).
- Forme : `{ leader: {score, confidence, evidences:[{quote,message_id,start_seconds}]}, team_player, creative, reliable_executor, fighter, empathetic, adaptable, analytical }`.
- `generate-report` : ajout du bloc au schéma d'outil en facultatif, consigne avec la grille, réparation des horodatages des citations comme pour `personality_profile`, écriture dans `interw_profiles`.
- Nouvelle fonction `compute-interw-profiles` (JWT vérifié, `has_project_access`) pour les anciens rapports, modèle `MODEL_FAST`.
- Front : `src/components/session/InterwProfilesRadar.tsx` (recharts `RadarChart`, tokens du thème), intégré dans `SessionReportView.tsx` ; moyenne du poste ajoutée dans `useProjectAverages.ts` ; sélection de la colonne dans `useSessionDetail.ts`.
- Grille des 8 profils partagée dans `supabase/functions/_shared/interw-profiles.ts` et une copie front pour les infobulles.
