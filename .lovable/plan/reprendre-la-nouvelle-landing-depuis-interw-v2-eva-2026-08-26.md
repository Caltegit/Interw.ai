# Reprendre la nouvelle landing depuis « Interw V2 Eva »

## Ce qui change
La page d'accueil publique est remplacée par la nouvelle version (paquet `transfert-landing/` du projet Interw V2 Eva) : nouvelle structure de sections, cartes d'entonnoir, visuels peints en arrière-plan, logos clients, vidéo de démonstration transparente.

Le reste de l'application n'est pas touché : parcours candidat, espace recruteur, e-mails, base de données restent identiques.

## Décisions retenues
- La nouvelle landing remplace la page d'accueil `/`.
- Un utilisateur déjà connecté continue d'être redirigé automatiquement vers son tableau de bord.
- Les boutons « Demander une démo » ouvrent le lien Google Agenda (plus de formulaire ni d'enregistrement en base sur la page d'accueil).

## Étapes

### 1. Visuels et vidéo
- Copie des images dans le projet : trois arrière-plans peints, quatre logos clients (Morning, E.Leclerc, Castalie, ad's up), trois captures produit.
- Copie des deux fichiers de démonstration dans les fichiers publics : version transparente (WebM) et version de secours (MP4, déjà présente, elle sera remplacée par celle du paquet).

### 2. Page et composants
- Nouvelle page d'accueil et nouveau composant de cartes d'entonnoir.
- Adaptation au routeur du projet (React Router) : liens internes vers `/login`, `/produit`, `/legal`, `/privacy`, qui existent déjà ici.
- Réintégration de la redirection automatique vers le tableau de bord pour les personnes connectées.
- Tous les appels à l'action pointent sur le lien Google Agenda.

### 3. Styles
- Ajout des animations de la nouvelle landing au CSS global, en fusionnant les animations qui portent déjà le même nom dans ce projet plutôt qu'en créant des doublons.

### 4. Référencement
- Titre, description, partage social et adresse canonique de la page d'accueil mis à jour dans l'en-tête du site, sur `https://interw.com/`.

### 5. Sources de la vidéo
- Le dossier de génération vidéo du paquet est ajouté à côté de celui qui existe déjà dans ce projet, sous un nom distinct, pour pouvoir régénérer la démonstration plus tard sans écraser les vidéos actuelles.

### 6. Vérifications
- Compilation du projet.
- Contrôle visuel de la page d'accueil (haut de page, vidéo qui se lance, logos, sections produit, questions fréquentes, pied de page) en desktop et en mobile.
- Contrôle que la redirection vers le tableau de bord fonctionne toujours quand on est connecté.

## Détails techniques
- Destination : `src/pages/Landing.tsx`, `src/components/landing/FunnelCards.tsx`, `src/assets/backgrounds/`, `src/assets/logos/`, `src/assets/`, `public/demo-interwai.webm` + `public/demo-interwai-20s.mp4`, animations ajoutées à `src/index.css`, métadonnées dans `index.html`, sources vidéo dans `remotion-landing/`.
- L'import `Link` passe de `@tanstack/react-router` à `react-router-dom`.
- Le fichier `route-index.tsx` du paquet (TanStack Start) n'est pas repris : la route `/` reste déclarée dans le routeur existant ; ses métadonnées sont portées dans l'en-tête HTML.
- Les images sont copiées en vrais fichiers (aucun pointeur d'asset recopié d'un projet à l'autre).
- Conflits de noms d'animations repérés dans le CSS actuel (`landing-fade-up`, `landing-pulse-glow`) : ils seront réconciliés lors de la fusion.
- L'ancienne page d'accueil et sa fenêtre de demande de démo restent dans l'historique du projet ; le composant de formulaire n'est pas supprimé s'il sert ailleurs.
