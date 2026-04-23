

## Aligner le rapport partagé sur celui du site

### Constat

La page publique `SharedReport.tsx` (`/shared-report/:token`) affiche aujourd'hui un sous-ensemble du rapport visible côté RH dans `SessionDetail.tsx`. Manquent :

- La **durée** de l'session à côté de la date.
- L'**onglet Vidéos par question** (1 vidéo par réponse candidat).
- Le bloc **Évaluations par question** (question + score /10 + vidéo de la réponse + commentaire IA).
- La **transcription** complète de l'échange.
- Le **nom de l'IA** affiché dans la transcription pour distinguer les tours.

À l'inverse, on **ne montre pas** : les notes recruteur (privées), le bouton de partage, le bouton retour projet.

### Ce qu'on construit

**1. Page `SharedReport.tsx` réorganisée en 2 colonnes (comme le site)**

Colonne gauche :
- En-tête candidat (nom, projet, date, **durée** — ajoutée).
- Carte vidéo principale (déjà là).
- Carte score global + recommandation + note (déjà là).

Colonne droite, en **onglets** identiques au site :
- **Transcription** — liste des messages (rôle IA / candidat avec le nom de l'IA), même rendu visuel que `VirtualizedMessageList` mais en version simple sans virtualisation (volume modeste, lecture publique).
- **Vidéos** — une carte par réponse candidat avec lecteur vidéo et extrait du contenu.
- **Rapport** — résumé, points forts, axes d'amélioration, scores par critère, **évaluations par question avec vidéo intégrée** (nouveau), barème.

**2. Requête de données enrichie**

La page charge déjà `session_messages` partiellement. On élargit la requête pour récupérer `id, role, content, timestamp, video_segment_url, audio_segment_url, question_id, is_follow_up` (mêmes colonnes que `useSessionDetail`) et on récupère aussi `ai_persona_name` via `projects` (déjà dans le select à enrichir).

Les RLS en place autorisent déjà l'accès anonyme : `Anon can view session messages` (true), `Anon can view sessions` (true), `Anon can view shared reports` (via `report_shares`). Pas de migration nécessaire.

**3. Sous-composant partagé pour la transcription**

Pour éviter de dupliquer le rendu, on extrait un petit composant `SimpleMessageList` (non virtualisé) dans `src/components/session/`. Il affiche la même structure visuelle que le site : bulles distinctes IA / candidat, horodatage, indicateur « relance » si `is_follow_up`.

**4. Petits correctifs en passant**

- Coquille « l'analyse de l'session » → « l'analyse de la session » dans `SessionDetail.tsx` ligne 342.
- Coquille « Rapport d'session » → « Rapport de session » (titre du template email transactionnel `interview-report.tsx`).

### Fichiers touchés

- `src/pages/SharedReport.tsx` — refonte en 2 colonnes + onglets, ajout durée, transcription, vidéos par question, évaluations par question.
- `src/components/session/SimpleMessageList.tsx` — **nouveau**, rendu lecture seule de la transcription (réutilisé par la page partagée).
- `src/pages/SessionDetail.tsx` — fix coquille « l'session ».
- `supabase/functions/_shared/transcational-email-templates/interview-report.tsx` — fix `displayName`.

### Hors champ

- Streaming/protection avancée des vidéos partagées (signed URLs courtes).
- Téléchargement PDF du rapport partagé.
- Filtrage des informations sensibles (email du candidat reste affiché — comportement actuel inchangé).

