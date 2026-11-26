# Guide de migration Interw V1 → V2 (pour agent IA)

Ce document s'adresse à l'agent qui construit Interw V2 (app.interw.com, base Convex).
Il complète la référence de l'API : https://interw.com/docs/export-api.md

## 1. Ce que la V1 fournit, et ce qu'elle ne fait pas

- La V1 expose une **API d'export en lecture seule** (`export-api`, entête `x-api-key`).
- La V1 **n'écrit jamais dans la V2**. C'est la V2 qui lit, transforme et crée tout chez elle :
  organisations, membres, postes, questions, critères, sessions, transcriptions, rapports, fichiers.
- Chaque appel est journalisé côté V1 (action, filtres, code, durée, taille, nombre d'éléments, IP).
  Consultable via `action=logs`.
- Les jetons d'accès candidats ne sont jamais renvoyés.

## 2. Volumes (26/11/2026)

| Élément | Nombre |
|---|---|
| Organisations | 56 (25 avec au moins un entretien) |
| Utilisateurs recruteurs | 108 |
| Postes | 186 |
| Questions | 1 567 |
| Critères d'évaluation | 688 |
| Sessions | 3 510 (1 497 terminées, 88 en cours, 1 696 jamais commencées) |
| Vidéos de réponse | ≈ 11 400 (9 679 WebM, 1 684 MP4) |
| Vidéos d'intro de poste | 52 (24 MP4, 18 WebM, 10 MOV) |

Organisations actives sur les 30 derniers jours : Castalie, Ads up, Morning, Tango.

## 3. Ordre de création conseillé côté V2

Respecter les dépendances, en gardant l'identifiant V1 (`legacyId`) sur chaque objet pour rendre l'import rejouable (upsert, jamais de doublon) :

1. `orgs` → organisations
2. `members` + `users` → utilisateurs et rôles par organisation
3. `postes` → postes, avec leurs questions et critères (pondérations comprises)
4. `sessions` (paginé, filtré par organisation) → candidats et sessions
5. `session&id=` → messages, transcription, rapport, liens médias
6. Fichiers (vidéos, audio, CV, lettres) → téléchargés puis stockés en V2

Commencer par une petite organisation (Tango), valider, puis les autres. Castalie (≈ 2 250 sessions) en dernier.

## 4. Problématiques à intégrer

### 4.1 Comptes utilisateurs
- Les mots de passe ne sont pas exportables. Prévoir connexion Google, lien magique ou réinvitation par e-mail.
- Rapprocher les comptes par e-mail (en minuscules). Un même utilisateur peut appartenir à plusieurs organisations.

### 4.2 Vidéos : conversion obligatoire
- Les WebM d'enregistrement navigateur n'annoncent souvent pas leur durée : la V1 stocke la durée mesurée à l'enregistrement quand elle existe. En V2, mesurer la durée à l'import (ffprobe) et la stocker.
- Les `.mov` d'iPhone (intros de poste) ne se lisent pas sur Chrome Windows (conteneur QuickTime, pistes iOS spécifiques).
- Recommandation : tout convertir en **MP4 H.264 + AAC, `+faststart`**, à l'import et à chaque nouveau téléversement :
  `ffmpeg -i in -map 0:v:0 -map 0:a:0? -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out.mp4`
- Les liens signés expirent après 6 h : télécharger juste après l'appel `session`, sinon le relancer.
- Bande passante : ≈ 235 Go par mois de lecture vidéo en V1. Prévoir un stockage et une diffusion adaptés.

### 4.3 Sessions
- Statuts : `pending` (invitation jamais ouverte), `in_progress`, `completed`, `cancelled`. Les sessions `in_progress` anciennes sont des abandons.
- Des questions peuvent avoir été retirées d'un poste après des réponses : garder l'historique, ne numéroter que les questions réellement posées.
- Ne pas importer les invitations `pending` de postes fermés, sauf besoin explicite.

### 4.4 Scoring et rapports
- Note finale hybride : moyenne entre la note globale et la moyenne pondérée des critères ; un critère sans preuve est exclu du calcul.
- Profils Interw (8 profils, 0–100 %) : chaque note repose sur une citation exacte du candidat ; sans preuve, le profil est « non évalué ».
- Importer les rapports existants tels quels plutôt que de tout recalculer (coût IA).

### 4.5 Champs non disponibles
- `source`, `invited_by` et la langue des membres ne sont pas enregistrés en V1 : valeur `null`.

## 5. Adresses et liens existants

- Les candidats ont reçu des liens `https://interw.com/session/<slug>`. Ils doivent rester valides.
- Plan : la V1 passera sur `v1.interw.com` ; la V2 reprendra `interw.com` et devra rediriger `/session/<slug>` d'un poste V1 vers `https://v1.interw.com/session/<slug>` tant que ce poste est ouvert.
- La V1 renvoie déjà son bouton de connexion vers `https://app.interw.com/login` et n'autorise plus la création de postes.

## 6. Checklist de validation par organisation

- [ ] Nombre de postes, questions, critères identique à `stats` / `postes`
- [ ] Nombre de sessions par statut identique
- [ ] 10 vidéos tirées au hasard lisibles sur Chrome Windows et Safari iPhone, avec durée correcte
- [ ] Rapports et notes identiques à la V1 sur 5 sessions
- [ ] Membres connectés avec succès sur la V2
