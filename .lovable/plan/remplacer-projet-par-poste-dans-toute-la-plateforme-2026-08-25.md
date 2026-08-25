# Remplacer « projet » par « poste » dans toute la plateforme

## Objectif
Tout ce que lit un utilisateur (recruteur ou candidat) parle désormais de « poste » / « postes », jamais de « projet » / « projets ».

## Ce qui change

### Interface recruteur
- Sidebar : « Projets » → « Postes »
- Liste des postes, archives, création, édition, détail, statistiques, comparaison
- Boutons et titres : « Nouveau projet » → « Nouveau poste », « Créer un projet » → « Créer un poste », « Archiver le projet », « Supprimer le projet », etc.
- États vides, messages de confirmation, toasts, tooltips, filtres et sélecteurs de projet
- Bibliothèques (questions, critères, intros, modèles) et Copilote : toutes les mentions de projet
- Tableau de bord et pages Super Admin (compteurs « projets », détail organisation)

### Interface candidat
- Page d'accueil d'entretien, page publique du poste, écrans de test et de passation
- Toute mention « projet » visible par le candidat

### Emails et notifications
- Récapitulatif hebdomadaire, rapport d'entretien, copie de feedback, relances candidats
- Sujets et corps des emails

### Contenus marketing
- Landing et page Produit

## Ce qui ne change pas (technique)
- Les URL restent `/projects/...` : les changer casserait les liens déjà partagés et les liens candidats existants.
- Les noms techniques restent inchangés : table `projects`, colonnes `project_id`, composants `ProjectDetail`, variables, fonctions, requêtes.
- Aucune migration de base de données.

## Détails techniques
- Remplacement des chaînes visibles uniquement, dans ~49 fichiers `src/` (~141 occurrences) et dans les fonctions serveur / gabarits d'email qui contiennent du texte affiché.
- Respect des accords : « le poste », « du poste », « au poste », « ce poste », « les postes » (attention aux formulations où « projet » était masculin comme « poste » — accords identiques, mais relecture des phrases du type « projet créé » → « poste créé »).
- Éviter le remplacement automatique aveugle : les occurrences dans les migrations SQL, les commentaires de code et les identifiants ne sont pas touchées.
- Vérification finale : recherche des occurrences restantes de « projet » dans les chaînes affichées, plus contrôle visuel des pages clés (liste des postes, détail, parcours candidat).
