# Partager les rapports des candidats sélectionnés

Ajouter une nouvelle action dans le menu **Actions** (visible quand au moins un candidat est coché dans la liste de sessions du projet) permettant d'envoyer une synthèse par email à un tiers, avec les liens de partage des rapports.

## Comportement

1. Dans le menu **Actions** de la barre de sélection, ajouter un item **« Partager les rapports »** (icône `Share2` ou `Send`).
2. L'item est désactivé si aucun des candidats sélectionnés n'a de rapport généré.
3. Au clic, ouvrir un nouveau pop-up `ShareReportsDialog`.

## Contenu du pop-up

- **État de chargement** pendant la récupération / création des liens de partage.
- **Champ Objet** (pré-rempli) : `Rapports candidats - {titre du projet}`
- **Champ Message** (textarea éditable) pré-rempli avec :

```
Bonjour,

Voici les candidats intéressants à regarder :

1) Prénom Nom - Score IA : 8.4/10 - https://interw.ai/shared-report/xxxx
2) Prénom Nom - Score IA : 7.9/10 - https://interw.ai/shared-report/yyyy
3) ...

N'hésite pas à me faire un retour.

Merci,
```

- Les candidats sans rapport sont **exclus** de la liste, avec une mention discrète sous le textarea : *« N candidat(s) ignoré(s) (rapport non disponible) »*.
- Tri par score décroissant.

## Actions du pop-up

- **Bouton « Copier le texte »** — copie sujet + corps dans le presse-papier (toast de confirmation).
- **Bouton « Ouvrir dans ma messagerie »** — ouvre un lien `mailto:?subject=...&body=...` (URL-encodé) qui pré-remplit le client mail par défaut de l'utilisateur, sans destinataire (à saisir par l'expéditeur).
- **Bouton « Fermer »**.

Pas d'envoi via le serveur : c'est l'utilisateur RH qui envoie depuis son propre mail (le destinataire est un tiers libre).

## Détails techniques

**Fichiers à créer / modifier :**

- `src/components/project/ShareReportsDialog.tsx` (nouveau) — composant dialog autonome qui reçoit `recipients: { sessionId, name, score, reportId }[]` et `projectTitle`.
- `src/pages/ProjectDetail.tsx` :
  - Étendre la requête `reports` (ligne ~192) pour sélectionner aussi `id` (besoin du `report_id` pour `report_shares`).
  - Ajouter `const [shareReportsOpen, setShareReportsOpen] = useState(false)`.
  - Étendre `BulkActionsBar` (lignes 42-80) avec une prop `onShareReports` et un nouveau `DropdownMenuItem`.
  - Brancher l'action sur les deux instances de `BulkActionsBar` (lignes 734 et 960).
  - Monter `<ShareReportsDialog>` à côté de `<BulkEmailDialog>`.

**Récupération / création des share tokens :**

À l'ouverture du dialog, pour chaque `reportId` :
1. `select share_token from report_shares where report_id = ? and is_active = true limit 1`.
2. Si absent → `insert into report_shares (report_id, created_by) values (?, user.id) returning share_token`.
3. URL finale : `${window.location.origin}/shared-report/${share_token}`.

Exécuter les requêtes en parallèle avec `Promise.all`. Déduire le score depuis `reportsBySession[sessionId].overall_score` (déjà chargé côté page).

**Format mailto :**
```ts
const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
window.location.href = url;
```

Aucune migration DB, aucune edge function nouvelle.
