# Ajouter la date de réponse sur les cartes candidat

## Objectif
Dans la vue « cartes » d’un poste (`/projects/:id`), afficher la date à laquelle chaque candidature a été reçue, comme c’est déjà le cas dans la vue liste.

## Résultat attendu
- Chaque carte candidat affiche un libellé relatif (`Aujourd’hui`, `Hier`, `Il y a X jours`) issu du même champ que la vue liste (`sessions.created_at`).
- Le format visuel reste cohérent avec la vue liste : petit texte `text-muted-foreground`, sans surcharger l’en-tête de la carte.

## Périmètre
- Vue cartes uniquement (`SessionCard` et son appel dans `ProjectDetail`).
- Pas de changement de données ni d’API : `created_at` est déjà récupéré par la requête `loadSessionsAndReports`.

## Étapes

### 1. Typage et props
- Ajouter `created_at: string` dans l’interface `SessionLite` de `src/components/project/SessionCard.tsx`.

### 2. Affichage dans la carte
- Insérer, sous le nom du candidat, une ligne avec le même calcul relatif que la vue liste :
  - `Aujourd’hui` si 0 jour,
  - `Hier` si 1 jour,
  - `Il y a X jours` sinon.
- Utiliser une taille/variante de texte discrète (`text-xs text-muted-foreground`).

### 3. Passage de la donnée
- Vérifier que `ProjectDetail` transmet bien `created_at` à `<SessionCard />` ; ajuster si nécessaire.

### 4. Vérification
- Vérifier que `created_at` est bien inclus dans le `.select(...)` de `loadSessionsAndReports` (déjà présent aujourd’hui).
- Lancer le build TypeScript pour s’assurer qu’aucune erreur de type n’est introduite.

## Non inclus
- Modification de la vue liste.
- Changement du tri ou des filtres.
- Ajout de `completed_at` (la vue liste s’appuie sur `created_at`, donc les cartes suivent le même champ pour rester cohérentes).
