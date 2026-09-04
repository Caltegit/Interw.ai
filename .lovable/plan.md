# Connecter Claude ou ChatGPT à Interw (page en libre-service)

Vos clients pourront, depuis leur espace Interw, brancher eux-mêmes Claude ou ChatGPT sur leurs postes, candidats et rapports — sans passer par vous.

## Ce qui existe déjà

Le connecteur est en place côté serveur : quatre outils (lister les postes, lister les candidats, lire un rapport, lire une transcription), une connexion sécurisée où chaque personne se connecte avec son propre compte Interw, et l'écran d'autorisation qui s'affiche au moment du branchement. Ce qui manque, c'est uniquement la page qui explique tout ça et donne l'adresse à copier.

## Ce que j'ajoute

Une nouvelle page **Réglages → Connexion IA** (`/settings/connecteur-ia`), accessible depuis le menu Réglages existant :

1. **Une phrase d'intro** expliquant ce que l'assistant pourra faire, et la garantie que chacun ne voit que ses propres données.
2. **L'adresse du connecteur** dans un champ en lecture seule avec un bouton « Copier ».
3. **Deux guides pas à pas repliables** :
   - *Claude* : Réglages → Connecteurs → Ajouter un connecteur personnalisé → coller l'adresse → se connecter avec son compte Interw → autoriser.
   - *ChatGPT* : Réglages → Applications et connecteurs → Créer → coller l'adresse → se connecter → autoriser.
   Chaque étape est numérotée, en français, sans jargon technique.
4. **La liste des quatre actions** que l'assistant pourra faire, avec un exemple de question à poser ("Donne-moi la synthèse des candidats du poste Commercial").
5. **Un encadré sécurité** : l'autorisation est révocable à tout moment depuis Claude/ChatGPT, et l'assistant n'a accès qu'en lecture.

## Détails techniques

- Nouveau fichier `src/pages/settings/SettingsMcp.tsx`, route ajoutée dans `src/App.tsx` sous le layout protégé.
- Lien ajouté dans la navigation des réglages, à côté de Profil et Organisation.
- L'adresse affichée est construite à partir de l'URL du backend déjà connue du front (`https://<projet>.supabase.co/functions/v1/mcp`), pas codée en dur.
- Textes en français, tokens de couleur du thème, composants `Card`/`Accordion`/`Button` existants. Aucune modification du serveur MCP ni des outils.

## Point d'attention avant d'ouvrir aux clients

Le dernier contrôle de sécurité signale toujours 5 points critiques (vidéos, transcriptions, données candidats accessibles sans connexion via une adresse directe). Je recommande de les corriger avant d'inviter des clients à brancher leur assistant. C'est un chantier séparé — dites-moi si vous voulez que je l'enchaîne.
