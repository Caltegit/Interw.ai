# REBUILD_SPEC — Interw (interw.ai)

> Spécification fonctionnelle exhaustive, agnostique du stack, destinée à reconstruire l'application sur une autre plateforme.
> Source : code, schéma de base de données et configuration tels que présents dans ce dépôt à la date de génération.
> Conventions de marquage :
> - `[INCOMPLET]` : fonctionnalité présente dans l'UI ou les données mais dont une partie du backend manque, est mockée ou désactivée.
> - `[À VÉRIFIER]` : comportement non confirmable avec certitude par la seule lecture du code consulté.

---

## 1. Vue d'ensemble

Interw est une plateforme SaaS d'entretiens vidéo asynchrones menés par une intervieweuse IA, destinée aux équipes RH/recrutement.

Boucle produit :
1. Un recruteur crée un **projet** (= un poste à pourvoir) : description, langue, durée cible, persona IA, voix, questions, critères d'évaluation pondérés, message d'intro vidéo/audio/texte optionnel.
2. Le recruteur invite des candidats par email (ou via un lien public partageable). Chaque candidat obtient une URL personnelle nominative protégée par un jeton.
3. Le candidat ouvre la page, accepte le consentement de captation audio/vidéo, fait un test caméra/micro, puis passe l'entretien dans le navigateur. L'intervieweuse IA (voix de synthèse) pose les questions, écoute les réponses, déclenche éventuellement des relances, puis clôture la session.
4. Les segments audio/vidéo sont stockés. Une chaîne de traitement transcrit chaque segment, génère un rapport de décision structuré (verdict, scores, citations, recommandation), puis lance en parallèle une analyse para-verbale (voix) et non-verbale (corps/regard).
5. Le rapport est consultable par le recruteur dans l'app, partageable par lien public sécurisé, et envoyé par email aux destinataires configurés sur le projet. Le candidat reçoit un email de remerciement.
6. Le recruteur peut annoter chaque candidat, prendre une décision (rejeter / à creuser / shortlister / embaucher), comparer les candidats d'un projet, consulter des statistiques, et discuter avec un **copilote IA** au sujet des candidats ou pour concevoir l'entretien.

Personas :
- **Candidat anonyme** — accède uniquement à la page publique d'un projet et à l'URL nominative de sa session, sans compte. Tout est en français.
- **Membre d'organisation** (recruteur) — connecté ; gère les projets, sessions, rapports, bibliothèques et son organisation.
- **Admin d'organisation** — en plus, gère les membres, invitations, et certains réglages d'organisation. `[À VÉRIFIER]` : le rôle est défini dans la table des rôles utilisateur via l'enum `app_role`.
- **Super admin** — accès cross-organisations : création/édition/suppression d'organisations, création d'utilisateurs, impersonation, magic-links, files de traitement, monitoring email, statistiques globales.

Modèle économique tel qu'implémenté :
- Chaque organisation a un quota optionnel `session_credits_total` ou un quota illimité `session_credits_unlimited` (par défaut illimité).
- Un champ `pricing` libre (texte) sur l'organisation `[À VÉRIFIER]` — pas de logique de paiement, pas d'intégration Stripe/Paddle dans le code. La facturation est externe au produit.
- Pas d'abonnement géré dans l'application.

Identité produit : marque "Interw" / "interw.ai", couleur primaire indigo `#6366F1`, typo Inter, interface entièrement en français, ton sobre et factuel.

---

## 2. Inventaire exhaustif des fonctionnalités

### 2.1 Compte et accès recruteur

- **Connexion par email + mot de passe** sur `/login`.
- **Réinitialisation de mot de passe** sur `/reset-password`.
- **Lien magique** sur `/auth/magic-link` (envoi) et consommation via `/m/:token`.
- **Invitation à rejoindre une organisation** : un email envoie un jeton consommé sur `/invite/:token`. La page propose au candidat de créer un compte ou de se connecter, puis l'attache à l'organisation cible.
- **Bannière d'impersonation** affichée en permanence quand un super admin est connecté en tant qu'un autre utilisateur ; permet de quitter l'impersonation.

États : chargement, identifiants invalides, jeton expiré, jeton déjà utilisé, succès → redirection vers `/dashboard`.

### 2.2 Tableau de bord (`/dashboard`)

Affiche pour l'organisation courante : nombre de projets actifs, nombre de sessions récentes, indicateurs agrégés, accès rapides. `[À VÉRIFIER]` : composition exacte des cartes (chargé via `useDashboardData`).

### 2.3 Projets

#### 2.3.1 Liste des projets (`/projects`)

- Liste paginée des projets visibles dans l'organisation, hors archivés.
- Filtres : recherche texte, statut, créateur. `[À VÉRIFIER]`
- Actions par projet : ouvrir, dupliquer, partager, archiver.
- Bouton "Nouveau projet" → `/projects/new`.
- Lien "Archives" → `/projects/archives` (projets en statut archivé).

#### 2.3.2 Création d'un projet (`/projects/new`)

Formulaire à étapes :
1. **Infos générales** : titre interne, intitulé de poste affiché au candidat, langue (fr par défaut), durée cible, message d'introduction (texte ou vidéo/audio enregistré).
2. **Persona IA** : nom (par défaut "Sophie"), genre de voix (`male_fr` / `female_fr`), avatar image, fournisseur TTS (`browser` / `elevenlabs` / `openai` / `gemini-direct`), identifiant de voix.
3. **Champs candidat demandés** : intitulé du poste actuel, CV, LinkedIn, lettre de motivation — chacun avec `enabled` et `required`.
4. **Intro avant entretien** : activée ou non, mode (`text` / `audio` / `video`), texte, fichier média, option "première écran" (intro affichée avant le test caméra).
5. **Questions** (étape `StepQuestions`) : liste ordonnée. Pour chaque question : titre court, énoncé complet, type (`open` / autre), durée max de réponse, hint, niveau de relance (`light` / `medium` / `deep`), follow-up activé + nb max de relances, média associé (audio/vidéo de la question), avatar dédié.
6. **Critères d'évaluation** (`StepCriteria`) : liste ; pour chaque critère : libellé, description, poids (entier, somme normalisée à 100), échelle (`0-5` ou `0-10`), portée (`all_questions` ou ciblée), ancres (jsonb décrivant les niveaux).
7. **Récapitulatif** + publication.

Outils :
- **Import depuis une offre d'emploi en ligne** (`ImportFromJobDialog`) : on colle une URL, le backend scrape la page, l'IA propose un brouillon de questions + critères pondérés que le recruteur peut accepter.
- **Insertion depuis bibliothèque** : questions, critères, intros, ou un template d'entretien complet (`InterviewTemplatePickerDialog`).
- **Personnalisation IA d'un texte** (`AiTextCustomizerDialog`) — `[À VÉRIFIER]` : permet de raffiner un message via l'IA.

#### 2.3.3 Édition d'un projet (`/projects/:id/edit`)

Mêmes étapes que la création. Permet aussi de gérer :
- Le **message de remerciement candidat** (`candidate_email_subject` / `candidate_email_body`) avec variables `{firstName}`, `{jobTitle}`, `{orgName}`.
- Le **message de pré-session** affiché au candidat avant de démarrer.
- Le **message de complétion** affiché à la fin.
- Les **destinataires du rapport** (`report_recipient_user_ids`) — liste d'utilisateurs de l'organisation qui recevront l'email de rapport. Liste vide = opt-out total, aucun email.
- La **visibilité du projet** (`visible_to_user_ids`) — restriction d'accès interne. `[À VÉRIFIER]`
- Réglages d'enregistrement : `record_audio`, `record_video`, `auto_skip_silence`, `allow_pause`, `allow_skip_question`, `show_question_timer`, `audio_analysis_enabled`.
- Modes d'intro IA et de transitions IA : `auto` (généré à la volée) ou `custom` (texte fourni).

#### 2.3.4 Détail d'un projet (`/projects/:id`)

- En-tête : titre, statut, actions (éditer, archiver, dupliquer, comparer, statistiques, partager).
- Onglet **Sessions** : liste de toutes les sessions du projet avec colonnes candidat, statut, date, fit-score, recommandation IA, décision recruteur, score.
- Onglet **Public** : aperçu/édition de la page publique (`/projects/:id/public-page`).
- Onglet **Copilote** : panneau latéral du copilote IA (analyse / design).

#### 2.3.5 Édition de la page publique (`/projects/:id/public-page`)

- Active une page publique candidate à l'URL `/p/:slugPublic`.
- Permet d'éditer le contenu (`content` jsonb), une image de couverture, le SEO (titre, description).
- Le slug public est unique et peut être importé via `import-public-page-from-url` (édition assistée IA `[À VÉRIFIER]`).

#### 2.3.6 Page publique candidate (`/p/:slugPublic`)

- Accessible sans authentification.
- Affiche le poste et un CTA pour postuler.
- Enregistre une vue dans `project_page_views` (hash visiteur + referrer + date), via la fonction edge `track-project-view`.
- À la soumission, crée une session candidat puis redirige sur l'URL personnelle nominative.

#### 2.3.7 Comparaison de candidats (`/projects/:id/compare`)

- Sélectionne plusieurs sessions du même projet ; affiche un tableau ou radar comparant fit-score, scores par critère, recommandations, soft skills, communication. `[À VÉRIFIER]` : composantes exactes.

#### 2.3.8 Statistiques du projet (`/projects/:id/stats`)

- Volumes : sessions totales, vues de la page publique sur N jours, taux de complétion, score moyen, distribution des recommandations.
- `[À VÉRIFIER]` : graphes exacts.

#### 2.3.9 Archives (`/projects/archives`)

- Liste des projets en statut `archived`. Possibilité de les restaurer. `[À VÉRIFIER]`

### 2.4 Sessions et entretiens

#### 2.4.1 Liens candidat envoyés par le recruteur

Pour chaque candidat ajouté à un projet, la session reçoit un jeton aléatoire (32 octets hex). Les URL nominatives sont :
- `/session/:slug` — landing avec règles et conditions, avant le test caméra.
- `/session/:slug/test/:token` — test caméra / micro (avec mesure de niveau micro, sélection de périphérique, diagnostics navigateur).
- `/session/:slug/start/:token` — entretien live (page principale).
- `/session/:slug/complete/:token` — page de fin.
- `/session/:slug/privacy/:token` — informations RGPD et bouton de suppression par le candidat.
- `/session/:slug/demo` — variante démo (sans enregistrement, sans rapport).
- `/session/cancelled` — page d'annulation.

Les anciennes URLs `/interview/...` sont redirigées automatiquement vers `/session/...` pour ne pas casser les liens déjà envoyés.

#### 2.4.2 Landing candidat (`/session/:slug`)

- Affiche le poste, le nom de l'organisation, le logo, le pitch et la durée estimée.
- Demande au candidat son nom, son email, et selon la configuration du projet : intitulé du poste actuel, CV (upload fichier), URL LinkedIn, lettre de motivation (upload fichier). Champs marqués obligatoires/optionnels selon `candidate_fields`.
- Crée la session (`status = pending`) et redirige vers le test caméra.

#### 2.4.3 Test caméra/micro (`/session/:slug/test/:token`)

- Détecte la compatibilité navigateur (présence de `getUserMedia`, `MediaRecorder`, `AudioContext`, détection in-app webview).
- Permet de choisir le micro et la caméra parmi les périphériques détectés.
- Mesure le niveau micro pendant quelques secondes (`measureMicLevel`) ; valide si supérieur à un seuil minimal.
- Enregistre l'environnement dans `session_attempts` (compat, OS, browser, niveau de support, raison de blocage éventuelle, viewport).
- Affiche un dialogue de consentement RGPD (`ConsentDialog`) que le candidat doit accepter ; enregistre `consent_accepted_at`.
- Peut afficher un blocage `MicBlockingDialog` si le test échoue, et un message d'avertissement `MicFailureBanner`.

#### 2.4.4 Entretien live (`/session/:slug/start/:token`)

Boucle principale, intégralement côté client + edge functions :
1. **Boot** : étapes affichées (`InterviewBootProgress`) — accès média, déverrouillage audio, préchargement TTS des phrases statiques (`prefetchTransitionPhrases`), capture du premier flux.
2. **Plein écran** (`FullscreenPrompt`) imposé.
3. **Intro IA** : si activée, lecture d'un message de bienvenue (TTS ou audio préenregistré) via `QuestionMediaPlayer`.
4. **Pour chaque question** :
   - Affichage de l'énoncé, du timer si activé, de la position (n/N).
   - Lecture du média de la question (vidéo, audio ou texte parlé par TTS).
   - Démarrage de l'enregistrement du candidat (audio + vidéo selon `record_audio`/`record_video`).
   - Indicateur de niveau micro (`MicVolumeMeter`), surveillance de la santé micro (`useMicHealthWatcher`), indicateur de qualité réseau (`useNetworkQuality`).
   - Le candidat peut, selon les réglages : passer la question, faire une pause, terminer sa réponse manuellement.
   - À la fin de la réponse : upload du segment dans le stockage (clé `interviews/{sessionId}/...`), création d'un `session_message` `role=candidate` avec `audio_segment_url` / `video_segment_url`.
   - Appel à l'edge function `ai-conversation-turn` qui décide : `follow_up` (relance), `next` (passer à la suivante avec une mini-transition vocale optionnelle) ou `end`. Côté serveur, un garde-fou impose `next`/`end` selon la position et le quota de relances.
   - Si `follow_up`, ajout d'un `session_message` `role=ai is_follow_up=true` et nouvelle réponse candidat.
   - Si `next`, message IA de transition et passage à la question suivante.
5. **Fin de session** : `status = completed`, `completed_at` posé, redirection vers `/session/:slug/complete/:token`.
6. **Appel à `finalize-session`** qui enqueue un job de génération de rapport.

États gérés :
- Perte de réseau : indicateur visible ; `forceMaxFollowUps` peut être passé à `ai-conversation-turn` pour interdire les relances quand le réseau est dégradé.
- Refus du micro : dialogue bloquant, possibilité de réessayer.
- Tentative de reprise : `/session/:slug/start/:token` rechargé reprend à `last_question_index` ; bandeau audio s'il y a des problèmes.
- Pause si autorisée.

#### 2.4.5 Démo candidat (`/session/:slug/demo`)

- Variante de l'entretien marquée `is_demo = true`.
- Aucune transcription, aucun rapport, aucun email candidat ni recruteur ne sont déclenchés.

#### 2.4.6 Page de fin (`/session/:slug/complete/:token`)

- Affiche `completion_message` du projet, des liens vers la politique de confidentialité, et la bannière de remerciement.
- Programmation côté client de la requête `finalize-session` si pas déjà déclenchée.

#### 2.4.7 Page vie privée candidat (`/session/:slug/privacy/:token`)

- Donne au candidat le détail de ce qui est conservé.
- Bouton "Supprimer mes données" → appelle `candidate-self-delete` qui purge les fichiers, messages et la session ; trace dans `data_purge_log`.

#### 2.4.8 Page annulée (`/session/cancelled`)

- Affichée si le candidat est arrivé sur une session déjà annulée. `[À VÉRIFIER]` : déclencheur exact.

#### 2.4.9 Détail d'une session côté recruteur (`/sessions/:id`)

- En-tête : photo/profil candidat, statut, fit-score, recommandation IA, décision recruteur, score, score communication, score body language.
- **Decision banner** : score Fit Poste mis en exergue, code couleur (`≥70` vert, `≥45` orange, sinon rouge), menu d'actions (régénérer le rapport, partager, supprimer).
- **Score Overview Card** : graphique global + scores critères.
- **Executive Summary Card** : verdict en 1 phrase + résumé exécutif 3-5 phrases.
- **Decision Drivers** : 2-4 raisons clés, chacune avec citation horodatée du candidat (clic = saute au moment dans la vidéo).
- **Fit Breakdown** : une carte par critère avec score, niveau, statement, citation.
- **Signals** : signaux à creuser, gravité, citation, question suggérée à poser en entretien physique.
- **Communication profile** : 5 dimensions notées /10 (clarity, structure, concision, posture, energy).
- **Paraverbal profile** : 6 dimensions vocales /10.
- **Nonverbal profile** : 4 dimensions corporelles /10 + micro-tensions.
- **Personality Radar** (Big Five) : 5 traits, chacun 0-100 avec interprétation et niveau de confiance.
- **Question/Answer rows** : pour chaque question, score /10, résumé, citation, niveau de profondeur, mention "relance posée" / "relance utile".
- **Soft skills** : 3 à 6 entrées notées /10.
- **Red flags** : éventuels points bloquants.
- **Highlights / clips** : 3 moments forts identifiés (force/personnalité/vigilance) avec lecture inline (`SessionClipPlayer`, `HighlightReelPlayer`).
- **Vidéo + navigation chapitrée** par question (`SessionVideoNavigator`).
- Annotations recruteur : note libre, décision (none / shortlist / dig_deeper / reject / hired `[À VÉRIFIER]`), partage par lien public sécurisé, email groupé aux candidats du projet.
- Bouton d'export vidéo (page dédiée `/sessions/:id/export`).
- Audio health banner si la session a >30 % de réponses silencieuses ; bannière "données non fiables" si >80 %.
- Disclaimer IA permanent.

#### 2.4.10 Export vidéo (`/sessions/:id/export`)

- Page plein écran sans sidebar.
- Compose en local un MP4 (concaténation des segments + introductions IA via `videoComposer`, worker `videoExport.worker.ts`/`videoClipToMp4.worker.ts`, `ffmpeg-core.js` packagé dans `public/ffmpeg/`).
- Téléchargement direct.

### 2.5 Bibliothèques (Ressources)

Point d'entrée `/library`. Sous-éléments :
- **Sessions / templates d'entretien** (`/library/sessions`) : modèles complets d'entretien (`interview_templates`) réutilisables sur un nouveau projet. Édition sur `/library/sessions/:id`. Inclut questions et critères pré-définis.
- **Questions** (`/library/questions`) : bibliothèque de questions d'organisation (`question_templates`).
- **Critères** (`/library/criteria`) : bibliothèque de critères pondérés (`criteria_templates`).
- **Intros** (`/library/intros`) : messages d'intro réutilisables (texte/audio/vidéo).
- **Emails** (`/library/emails`) : templates d'email candidat de l'organisation (`candidate_message_templates`), surcharges `email_template_overrides`. Réservé aux super admins dans la sidebar.

Chaque élément peut être créé, édité, supprimé ; vu par tous les membres de l'organisation.

### 2.6 Copilote IA recruteur

Bouton flottant (`CopilotFloatingButton`) ouvrant un panneau latéral (`CopilotSidePanel` / `CopilotDrawer`) sur les pages projet et session. Deux modes :
- **Analysis** : à partir d'un projet sélectionné, l'IA dispose de tous les rapports des candidats (nom, score, recommandation, résumé, scores critères, soft skills, red flags, notes recruteur, décisions) et répond aux questions du recruteur en français, structurées en Markdown.
- **Design** : à partir d'un projet en construction, l'IA aide à concevoir l'entretien — peut proposer des questions et critères calibrés. Quand elle propose, elle émet des blocs ```json avec `type: "questions_suggestion"` ou `type: "criteria_suggestion"` que l'app parse pour afficher des boutons "Ajouter au projet". L'IA pioche aussi des exemples dans les bibliothèques de l'organisation.

Stockage : `copilot_threads` (1 par discussion, attachée à un projet et un utilisateur) + `copilot_messages`. Historique limité à 30 derniers messages. Refus systématique des questions discriminatoires.

### 2.7 Paramètres organisation et utilisateur (`/settings`)

- Profil : nom complet, email.
- Organisation courante : nom, logo (`OrgLogoUpload`), slug public utilisé pour `/o/:slug`.
- Membres (`OrgMembers`) : liste, suppression, changement de rôle. Réservé aux admins de l'organisation.
- Invitations en cours.
- Détection biais activable (`enable_bias_detection`) `[INCOMPLET]` : drapeau présent en BDD mais aucun branchement applicatif confirmé dans le code lu.
- Clonage de voix (`VoiceCloneDialog` + edge function `clone-voice`) : enregistre un échantillon, envoie à ElevenLabs, sauvegarde l'identifiant cloné sur le profil. Champ de consentement `cloned_voice_consent_at` requis.
- `OrganizationSwitcher` : un utilisateur appartenant à plusieurs organisations peut basculer.

### 2.8 Feedback produit

- `/feedback` : liste des discussions feedback de l'utilisateur (`feedback_threads`).
- `/feedback/:threadId` : conversation avec l'équipe interne ; messages (`feedback_messages`) avec rôle (`user`/`support`), marqueur de lecture par le destinataire.
- Création via `NewFeedbackDialog` (sujet libre).
- Statuts : `open`, `closed`, autres (`feedback_status` enum). Changement via `FeedbackStatusSelect`.
- Badge non lu visible dans la sidebar (`useUnreadFeedback`).

### 2.9 Page organisation publique (`/o/:slug`)

Affiche les projets publics de l'organisation, branding, lien vers son site, etc. `[À VÉRIFIER]` : contenu exact.

### 2.10 Rapports partagés

- Le recruteur peut créer un partage public d'un rapport (`ShareReportDialog`) → URL `/shared-report/:token`.
- Optionnellement protégé par un mot de passe / phrase (`viewer_secret`) consommé par `consume-report-share`.
- Le partage peut avoir une expiration et être désactivé.

### 2.11 Highlights publics (`/highlights/:token`)

Page publique anonyme pour partager les seuls clips highlights d'une session, sans rapport complet. `[À VÉRIFIER]` : périmètre précis.

### 2.12 Désabonnement (`/unsubscribe`, `/email-unsubscribe`)

Page de désinscription des emails (`handle-email-unsubscribe`) avec confirmation avant désabonnement effectif ; ajoute l'email à `suppressed_emails`.

### 2.13 Landing et site marketing

- `/` : landing produit (hero, sections valeur, témoignages mockés `[À VÉRIFIER]`, CTA "Demander une démo" via `DemoRequestDialog` → email `demo-request`).
- `/produit` : page produit détaillée.
- `/legal` : mentions légales.
- `/privacy` : politique de confidentialité.

### 2.14 Super Admin

Accessible uniquement avec rôle super admin.

- `/admin` : tableau de bord (`StatsOverview`) + onglets organisations (`OrgsTable`) et utilisateurs (`UsersTable`).
- `/superadmin/orgs/:orgId` : détail d'une organisation, édition (`EditOrgDialog`), création d'utilisateur dans cette organisation (`CreateUserInOrgDialog`), gestion des projets.
- Création d'organisation (`CreateOrgDialog`) via `superadmin-create-org`.
- Suppression via `superadmin-delete-org`.
- **Impersonation** d'un utilisateur via `superadmin-impersonate`.
- **Magic links super admin** (`superadmin-magic-link`) : génère un lien de connexion à durée limitée pour un email donné ; tracé dans `superadmin_magic_links` (ip utilisée + date d'usage). Listés/regénérés.
- `/admin/emails` : monitoring des envois email (`AdminEmails`) — historique, échecs, retry.
- `/admin/sessions-queue` : file des sessions en cours de traitement / blocages éventuels.
- `/admin/report-jobs` : file `report_jobs`, statut, tentatives, dernière erreur.
- `/admin/tts-compare` : outil interne de comparaison des fournisseurs TTS.
- `/admin/tuto` : éditeur d'un didacticiel public stocké dans le bucket `tutorials`.

### 2.15 Suppression et conservation des données

- Le candidat peut s'autodétruire (`candidate-self-delete`).
- Le recruteur peut supprimer une session (`delete-session`) ; cascade sur messages, transcripts, reports, fichiers du bucket.
- Cron RGPD `purge-old-videos` : 12 mois après `completed_at`, supprime les fichiers vidéo/audio mais conserve la session, le rapport et le transcript ; trace dans `data_purge_log`.

### 2.16 Outils internes [À VÉRIFIER]

- `backfill-orphan-reports`, `backfill-report-timestamps`, `recover-session-video`, `retry-missing-analyses`, `replay-nonverbal-batch`, `report-interview-issue` (formulaire candidat signalant un problème), `cancel-session`, `clone-voice`, `delete-cloned-voice`, `consume-report-share`, `redeem-magic-link`, `seed-e2e-user` (test E2E uniquement).

---

## 3. Carte des écrans

| Route | Authentification | Rôle | Contenu | Actions principales | Sortie |
|---|---|---|---|---|---|
| `/` | Public | — | Landing marketing | Demander une démo, aller au login | `/login`, dialog démo |
| `/produit` | Public | — | Page produit détaillée | — | — |
| `/legal`, `/privacy` | Public | — | Pages légales | — | — |
| `/login` | Public | — | Connexion email/mdp | Se connecter, reset mdp, magic link | `/dashboard` |
| `/reset-password` | Public | — | Demande de reset | Envoyer email | — |
| `/auth/magic-link` | Public | — | Demande d'envoi d'un lien magique | Envoyer | — |
| `/m/:token` | Public | — | Consommation magic link | Auto-redirige | `/dashboard` |
| `/invite/:token` | Public | — | Acceptation invitation org | Créer compte / se connecter | `/dashboard` |
| `/session/:slug` | Public anon | Candidat | Landing entretien + formulaire candidat | Démarrer | `/session/:slug/test/:token` |
| `/session/:slug/test/:token` | Public anon | Candidat | Test caméra/micro + consentement | Valider | `/session/:slug/start/:token` |
| `/session/:slug/start/:token` | Public anon | Candidat | Entretien live | Répondre, pause, skip | `/session/:slug/complete/:token` |
| `/session/:slug/complete/:token` | Public anon | Candidat | Page de fin | Voir confidentialité | `/session/:slug/privacy/:token` |
| `/session/:slug/privacy/:token` | Public anon | Candidat | Vie privée + auto-suppression | Supprimer mes données | — |
| `/session/:slug/demo` | Public anon | Candidat | Variante démo sans rapport | Tester | `/session/:slug/demo/end` |
| `/session/cancelled` | Public anon | — | Page annulée | — | — |
| `/shared-report/:token` | Public anon | Recruteur externe | Rapport partagé en lecture seule | (option mot de passe) | — |
| `/highlights/:token` | Public anon | — | Clips highlights publics | Lire | — |
| `/o/:slug` | Public | — | Page publique d'une organisation | Voir projets | `/p/:slugPublic` |
| `/p/:slugPublic` | Public | Candidat | Page publique d'un projet | Postuler | `/session/:slug` |
| `/unsubscribe` | Public | — | Désinscription email | Confirmer | — |
| `/dashboard` | Auth | Recruteur | Tableau de bord org | Vers projets, sessions | — |
| `/projects` | Auth | Recruteur | Liste projets | Créer, ouvrir, archiver | `/projects/:id`, `/projects/new` |
| `/projects/new` | Auth | Recruteur | Wizard de création | Enregistrer | `/projects/:id` |
| `/projects/archives` | Auth | Recruteur | Projets archivés | Restaurer | — |
| `/projects/:id` | Auth | Recruteur | Détail projet, sessions | Inviter, comparer, stats | `/sessions/:sessId` |
| `/projects/:id/edit` | Auth | Recruteur | Édition projet | Sauvegarder | `/projects/:id` |
| `/projects/:id/public-page` | Auth | Recruteur | Édition page publique | Publier | `/p/:slugPublic` |
| `/projects/:id/compare` | Auth | Recruteur | Comparaison candidats | Sélectionner | — |
| `/projects/:id/stats` | Auth | Recruteur | Statistiques projet | — | — |
| `/library` | Auth | Recruteur | Accueil bibliothèques | Choisir sous-section | — |
| `/library/sessions` | Auth | Recruteur | Templates entretien | Créer, éditer | `/library/sessions/:id` |
| `/library/sessions/:id` | Auth | Recruteur | Éditer template | — | — |
| `/library/questions` | Auth | Recruteur | Bibliothèque questions | CRUD | — |
| `/library/criteria` | Auth | Recruteur | Bibliothèque critères | CRUD | — |
| `/library/intros` | Auth | Recruteur | Bibliothèque intros | CRUD | — |
| `/library/emails` | Auth | Super admin | Templates email | CRUD | — |
| `/sessions/:id` | Auth | Recruteur | Détail session + rapport | Annoter, partager, décider | `/sessions/:id/export` |
| `/sessions/:id/export` | Auth | Recruteur | Export vidéo MP4 | Télécharger | — |
| `/settings` | Auth | Recruteur | Paramètres compte/org | Sauvegarder | — |
| `/feedback` | Auth | Recruteur | Liste fils feedback | Créer | `/feedback/:threadId` |
| `/feedback/:threadId` | Auth | Recruteur | Conversation feedback | Répondre, changer statut | — |
| `/admin` | Auth | Super admin | Console super admin | CRUD orgs/users | `/superadmin/orgs/:id` |
| `/superadmin/orgs/:orgId` | Auth | Super admin | Détail organisation | Créer user, impersonate | — |
| `/admin/emails` | Auth | Super admin | Monitoring emails | Retry | — |
| `/admin/sessions-queue` | Auth | Super admin | File sessions | Voir | — |
| `/admin/report-jobs` | Auth | Super admin | File rapports | Réessayer | — |
| `/admin/tts-compare` | Auth | Super admin | Comparateur TTS | Tester | — |
| `/admin/tuto` | Auth | Super admin | Éditeur tuto | Publier | — |

---

## 4. Modèle de données

> Types décrits en langage neutre : *texte*, *entier*, *décimal*, *booléen*, *date*, *date+heure*, *uuid*, *json*, *liste de…*. Les champs standards id/created_at/updated_at sont implicites sauf mention contraire.

### 4.1 Énumérations

- **app_role** : rôle utilisateur (super admin, admin d'organisation, membre). `[À VÉRIFIER]` valeurs exactes.
- **project_status** : statut projet (`active`, archivé, etc.).
- **project_language** : langue d'un projet, défaut `fr`.
- **ai_voice_type** : `female_fr`, `male_fr`, etc.
- **scoring_scale_type** : `0-5` ou `0-10`.
- **criteria_scope** : `all_questions` ou ciblée par question.
- **question_type** : `open`, autres types possibles.
- **session_status** : `pending`, `in_progress`, `completed`, `cancelled`, etc.
- **invitation_status** : `pending`, `accepted`, `expired`, etc.
- **report_job_status** : `queued`, `processing`/`locked`, `done`, `failed`.
- **recruiter_decision_type** : `none`, `reject`, `dig_deeper`, `shortlist`, `hired` `[À VÉRIFIER]`.
- **feedback_status** : `open`, `closed`, autres.

### 4.2 Organisations et utilisateurs

**organizations** — une entreprise cliente.
- nom, slug public (unique), logo, notes internes, tarification libre (texte), propriétaire.
- quota de sessions : illimité (booléen, défaut vrai) ou total entier.
- option `enable_bias_detection` (booléen) `[INCOMPLET]`.

**profiles** — un profil par utilisateur authentifié.
- nom complet, email, organisation principale.
- voix clonée : identifiant, nom, date de création, date de consentement.

**user_roles** — table dédiée des rôles (jamais sur `profiles`).
- utilisateur, rôle (`app_role`), organisation optionnelle (pour les rôles scopés à une org).

**organization_members** — adhésions multi-org.
- utilisateur, organisation. Unique par couple.

**organization_invitations** — invitations en attente.
- organisation, email invité, jeton (32 octets hex), statut, expiration (7 jours par défaut), invitant.

### 4.3 Projets

**projects** — un poste à pourvoir.
- titre interne, intitulé poste public, organisation, créateur.
- voix IA, nom de la persona (`Sophie` par défaut), langue, durée max, slug, statut, date d'expiration éventuelle.
- enregistrement : audio, vidéo, auto-skip silence, pause autorisée, skip question autorisé.
- intro : activée, mode (texte/audio/vidéo), texte, audio, vidéo, premier écran.
- IA : `ai_intro_enabled`, `ai_intro_mode` (`auto`/`custom`), `ai_intro_custom_text`, `ai_question_transitions_enabled`, `ai_question_transitions_mode`, `ai_question_transitions_custom_text`.
- TTS : provider (`browser`/`elevenlabs`/`openai`/`gemini-direct`), voice id, genre.
- Messages : `pre_session_message`, `completion_message`, `candidate_email_subject`, `candidate_email_body`.
- Acteurs : `report_recipient_user_ids` (qui reçoit les emails de rapport), `visible_to_user_ids` (qui voit le projet en interne).
- `candidate_fields` (json) : pour chaque champ candidat (job_title, cv, linkedin, cover_letter) un objet `{enabled, required}`.
- `audio_analysis_enabled`, `show_question_timer`.

**questions** — questions d'un projet.
- projet, ordre, titre, énoncé, type, hint, durée max de réponse, média (audio/vidéo), avatar dédié.
- relances : `follow_up_enabled`, `max_follow_ups`, `relance_level` (`light`/`medium`/`deep`).
- `scoring_criteria_ids` (liste) — critères évaluant cette question. `[À VÉRIFIER]` usage.
- `archived_at` : soft delete.

**evaluation_criteria** — critères pondérés d'un projet.
- projet, libellé, description, poids entier (somme à 100), échelle (`0-5`/`0-10`), portée, ancres jsonb, ordre.

**project_public_pages** — page publique candidate d'un projet.
- projet, slug public unique, activée, contenu jsonb, image de couverture, SEO (titre, description), date de publication.

**project_page_views** — vues anonymes de la page publique.
- projet, hash visiteur, date, referrer.

### 4.4 Bibliothèques

**interview_templates** — modèle complet d'entretien réutilisable.
- organisation, créateur, nom, description, catégorie, intitulé poste, durée par défaut, langue par défaut.
- persona IA, voix, TTS, avatar, intro, transitions IA, options enregistrement, candidate_fields, messages candidat.
- `clone_to_new_orgs` : si vrai, copié automatiquement dans chaque nouvelle organisation. `[À VÉRIFIER]` côté implémentation.

**interview_template_questions** — questions d'un template (mêmes champs que `questions`).
**interview_template_criteria** — critères d'un template (mêmes champs que `evaluation_criteria`, poids défaut 10).

**question_templates** — questions individuelles réutilisables (organisation).
**criteria_templates** — critères individuels réutilisables (organisation), avec catégorie optionnelle.
**intro_templates** — intros réutilisables (organisation) : type (`text`/`audio`/`video`), audio_url, video_url, texte, voix TTS.

**candidate_message_templates** — surcharge organisation d'un message candidat (clé = `candidate-thank-you`, etc.) : sujet, corps. Vars `{firstName}`, `{jobTitle}`, `{orgName}`.

**email_template_overrides** — surcharge organisation d'un template d'email (clé du template, activé, sujet, corps HTML).

### 4.5 Sessions et messages

**sessions** — un candidat sur un projet.
- projet, organisation, candidat (nom, email, téléphone, LinkedIn, intitulé poste actuel, fichiers CV et lettre + leur nom d'origine), jeton (32 octets hex).
- statut, dates : créée, démarrée, dernière activité, complétée, annulée, vidéo consultée, dernier rappel envoyé.
- durée calculée, dernière question vue (index), index `last_candidate_email_key`.
- consentement : `consent_given_at`, `consent_accepted_at`.
- enregistrements : `audio_recording_url`, `video_recording_url`, `thumbnail_url`.
- décision recruteur : `recruiter_decision` (enum), date, qui, `recruiter_note`, `assigned_to` (responsable interne).
- `is_demo` (booléen), `abandon_reminder_sent_at`.

**session_attempts** — tentative de démarrage côté candidat (diagnostic).
- session, user agent, OS, navigateur + version, type d'appareil, in-app webview + host, compat (`ok`/`warn`/`block`), raison de blocage, support des APIs media, viewport/screen, langue, `proceeded_anyway`.

**session_messages** — flux conversationnel.
- session, organisation, question liée, ordre (timestamp), rôle (`ai`/`candidate`), `is_follow_up`.
- contenu textuel (transcrit ou tapé), `content_raw` (snapshot de la version antérieure), `transcript_segments` (json horodaté), statut de transcription (`pending`/`processing`/`done`/`skipped`/`too_large`/`failed`), date de transcription.
- médias : `audio_segment_url`, `video_segment_url`, manifeste de chunks vidéo, `audio_quality` (json — peak RMS, etc.).

**transcripts** — transcript agrégé d'une session.
- session (unique), texte complet, texte formaté, nb mots, langue, durée.

### 4.6 Rapports

**reports** — rapport d'une session (1-1).
- score global 0-100, grade (A-E), recommandation (`strong_yes`/`yes`/`maybe`/`no`), résumé exécutif, résumé court (= verdict headline).
- listes : `strengths`, `areas_for_improvement`.
- jsonb : `criteria_scores`, `question_evaluations`, `personality_profile` (Big Five), `soft_skills`, `red_flags`, `motivation_scores`, `followup_questions`, `flagged_moments`, `highlight_clips`, `stats` (contient verdict_headline, decision_drivers, fit_breakdown, fit_score, signals, communication_profile, score_breakdown, audio_health…), `audio_health`, `coherence`, `reliability`, `timeline`, `highlights`.
- `paraverbal_analysis`, `nonverbal_analysis` (json — statut + profile + summary + segments analysés).
- révision : `reviewed_at`, `reviewed_by`, `generated_at`.

**report_jobs** — file de génération asynchrone.
- session (unique), organisation, statut (`queued`/`processing` via verrou/`done`/`failed`), tentatives, max tentatives (défaut 6), date prochaine tentative, verrou (`locked_at`/`locked_until`), dernière erreur.

**report_shares** — partages publics d'un rapport.
- rapport, jeton public (32 octets hex), créateur, actif, expiration optionnelle, `viewer_secret` (mot de passe optionnel), date consultation.

**data_purge_log** — trace RGPD.
- session, email candidat, source (`cron_video_retention`/`candidate_self_delete`/`session_deletion`/…), détails json, qui, quand.

### 4.7 Copilote

**copilot_threads** — fil de discussion.
- projet, créateur, titre (`Nouvelle conversation` par défaut, remplacé par le 1er message), mode (`analysis`/`design`).

**copilot_messages** — messages du fil.
- thread, rôle (`user`/`assistant`), contenu, `parts` (json, pour le rendu enrichi `[À VÉRIFIER]`).

### 4.8 Feedback

**feedback_threads** — fil de support produit.
- utilisateur, organisation, sujet, statut (`feedback_status`), dates, dernière activité.

**feedback_messages** — messages d'un fil.
- fil, auteur, rôle (`user`/`support`), contenu, date de lecture par le destinataire.

### 4.9 Emails

**email_send_log** — historique des envois.
- template, destinataire, statut (`pending`/`sent`/`failed`/`bounced`/`complaint`/…), message id, erreur, metadata json (peut contenir `session_id`).

**email_send_state** — singleton de configuration de la file email.
- taille de lot, délai entre envois, TTL auth (15 min) et transactionnel (60 min), `retry_after_until`.

**email_alert_config** — singleton.
- alerte activée, fenêtre d'analyse, seuil d'échecs, cooldown.

**email_alert_log** — déclenchement d'alertes échecs email (`check-email-failures`).

**email_unsubscribe_tokens** — un jeton unsubscribe par email.
- email (unique), jeton (32 octets hex), date d'utilisation.

**suppressed_emails** — adresses bloquées (bounce, plainte, désinscription).

**candidate_message_templates**, **email_template_overrides** — voir bibliothèques.

### 4.10 Super admin

**superadmin_magic_links** — magic links générés par un super admin.
- email cible, jeton, expiration, redirect, qui l'a créé, IP utilisée, date d'utilisation.

### 4.11 Indices notables

- `idx_sessions_abandon_reminder_pending` partiel sur (last_activity_at, created_at) where reminder non envoyé et statut pending/in_progress.
- `[À VÉRIFIER]` : autres indices sur sessions(project_id), session_messages(session_id, timestamp), reports(session_id unique), etc.

---

## 5. Règles d'accès (RLS — traduction métier)

Fonctions internes utilisées dans les règles :
- `is_super_admin(user)` : vrai si l'utilisateur est super admin.
- `is_org_admin(user, org)` : vrai si admin de l'organisation.
- `is_org_member(user, org)` : vrai si membre de l'organisation.
- `get_user_organization_id(user)` : organisation principale du profil.
- `has_role(user, role)` : générique.

### organizations
- Voir / éditer / créer / supprimer : super admin seulement (`[À VÉRIFIER]` : les membres peuvent voir leur propre organisation via une autre policy implicite — la table inclut un GRANT cohérent).
- L'application traite l'organisation courante du profil comme l'organisation à laquelle un membre est rattaché.

### profiles
- Un utilisateur voit, crée et modifie uniquement son propre profil.
- Les membres d'une organisation peuvent voir les profils des autres membres de la même organisation (si `organization_id` non nul et identique).
- Les super admins voient et modifient tous les profils.

### user_roles
- Lecture restreinte ; aucune écriture côté client. Géré via fonctions SECURITY DEFINER (super admin / impersonation).

### organization_members
- Voir : son adhésion ; les admins de l'org voient toutes ; les super admins voient tout.
- Toute écriture réservée aux admins de l'organisation et aux super admins.

### organization_invitations
- Visibles publiquement par jeton tant qu'elles sont `pending` et non expirées (pour permettre l'acceptation sans compte).
- Les membres d'une organisation voient les invitations de leur organisation.
- Création/édition/suppression : admins de l'organisation et super admins.

### projects
- Voir/éditer/supprimer : créateur, membres de la même organisation, super admins.
- Création : par un membre rattaché à l'organisation cible.

### questions / evaluation_criteria
- Voir/insérer/modifier/supprimer : créateur du projet, membres de l'organisation du projet, super admins.

### project_public_pages
- Visibles publiquement quand `enabled = true`.
- Édition : membres de l'organisation propriétaire et super admins.

### project_page_views
- Insertion publique (depuis la page candidate). Lecture : membres de l'organisation propriétaire.

### sessions
- Insertion / mise à jour / lecture par les candidats anonymes UNIQUEMENT si le projet est `active`. C'est ce qui rend le flux candidat possible sans compte.
- Lecture / modification / suppression côté connecté : membres de l'organisation de la session, super admins.

### session_messages
- Mêmes règles candidat anonyme que sessions (insertion/lecture/modification limitées aux projets actifs).
- Membres de l'organisation : voient et modifient les messages des sessions de leur organisation.
- Les rapports partagés publiquement donnent accès en lecture (anonyme ou connecté) aux messages de la session associée.

### transcripts
- Lecture : membres de l'organisation et super admins. `[À VÉRIFIER]` détails par session.

### session_attempts
- Insertion : tout le monde, y compris anonymes.
- Lecture : membres de l'organisation de la session.

### reports
- Lecture : membres de l'organisation, super admins. Lecture publique (anonyme ou connecté) si un partage actif et non expiré existe.
- Modification et suppression : membres de l'organisation et super admins.

### report_shares
- Création / modification / suppression : créateur du rapport, membres de l'organisation, super admins.
- `[À VÉRIFIER]` : lecture publique se fait via la fonction `consume-report-share` plutôt que via une policy de lecture anonyme.

### copilot_threads / copilot_messages
- Un utilisateur ne voit, crée, modifie et supprime QUE ses propres fils et messages, ET seulement sur des projets auxquels il a accès.

### question_templates / criteria_templates / intro_templates / interview_templates
- Voir/créer/modifier/supprimer : membres de l'organisation propriétaire. Création réservée à un membre rattaché à l'organisation, créateur = utilisateur courant.
- `interview_template_questions` et `interview_template_criteria` héritent : géré par tout membre de l'organisation propriétaire du template.

### candidate_message_templates
- Voir/créer/modifier/supprimer : membres de l'organisation propriétaire.

### email_template_overrides
- Voir/créer/modifier/supprimer : membres de l'organisation propriétaire ; super admins.

### feedback_threads / feedback_messages
- Voir / créer : l'auteur du fil et les super admins (support).
- Mise à jour du marqueur de lecture : auteur du fil ou support.
- Suppression : super admins.

### email_send_log, email_send_state, email_unsubscribe_tokens, suppressed_emails
- Réservés au rôle service (édition serveur). Pas d'accès direct utilisateur.

### data_purge_log
- Insertion par le rôle service. Lecture : super admins.

### superadmin_magic_links
- Aucun accès direct (policy `service role only` en deny). Toutes les opérations passent par fonctions edge dédiées.

### email_alert_config / email_alert_log
- Réservés au rôle service / super admin. `[À VÉRIFIER]`

### Storage (bucket `media`)
- Bucket public en lecture (statut `public = true` après migration).
- Écriture : autorisée à anon dans le préfixe `interviews/{sessionId}/...` pour permettre l'upload des segments candidats. `[À VÉRIFIER]` : règles exactes des policies storage.
- Bucket `tutorials` : public en lecture, écriture super admin.

---

## 6. Logique backend

### 6.1 Conventions communes des fonctions edge

- Toutes répondent en JSON, gèrent CORS (origin `*`).
- Configuration `verify_jwt` :
  - Fonctions ouvertes (`verify_jwt = false`) : `auth-email-hook`, `send-transactional-email`, `report-interview-issue`, `preview-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `get-email-template-defaults`, `seed-e2e-user`, `tts-elevenlabs`, `tts-openai`, `tts-gemini-direct`, `superadmin-impersonate`, `transcribe-session`, `finalize-session`, `finalize-abandoned-session`, `candidate-self-delete`, `consume-report-share`, `redeem-magic-link`.
  - Fonctions internes (`verify_jwt = true`) : `process-email-queue`, `check-email-failures`, `purge-old-videos`, `retry-missing-analyses`, `send-weekly-recaps`.
- Beaucoup de fonctions vérifient en interne l'appartenance organisationnelle de l'appelant via son jeton, même quand `verify_jwt` est faux.

### 6.2 Flux candidat → rapport

1. **`finalize-session`** (POST `{ session_id }`) : appelée par le client en fin d'entretien. Wrapper minimal qui appelle la fonction SQL `enqueue_report_job(session_id)` (déduplication par session).

2. **`process-report-queue`** : worker unique exécuté toutes les minutes (planifié via pg_cron `[À VÉRIFIER]` — la planification est gérée par les outils internes Lovable, pas par une migration apparente).
   - Récupère jusqu'à 3 jobs (`claim_report_jobs`) avec verrou.
   - Pour chaque job :
     a. Vérifie que la session est `completed` et non démo.
     b. Si pas encore de rapport : boucle d'appels à `transcribe-session` (jusqu'à 10 itérations, 3 min max) pour transcrire les segments restants, puis appelle `generate-report`.
     c. Tente d'envoyer l'email "candidate-thank-you" au candidat (idempotent par session).
     d. Marque le job `done` (`mark_report_job_done`) ou `failed` avec backoff exponentiel (`mark_report_job_failed`).
   - Espacement de 10 secondes entre jobs.
   - Avant de claim, requeue les jobs stuck (`requeue_stuck_report_jobs`).

3. **`transcribe-session`** (POST `{ session_id, force? }`) : transcrit jusqu'à 8 segments candidat non terminaux par appel. Détails en section 7 (IA).

4. **`generate-report`** (POST `{ session_id, force? }`) : pipeline complet de génération du rapport. Détails en section 7.

5. **`analyze-paraverbal`** et **`analyze-nonverbal`** : déclenchées en parallèle à la fin de `generate-report`. L'email recruteur n'est expédié qu'une fois les deux terminées (succès ou échec). Détails en section 7.

6. **`recover-session-video`**, **`finalize-abandoned-session`** : utilisés par le cron `cleanup-abandoned-sessions` quand des fichiers existent déjà → la session est récupérée plutôt que purgée. `[À VÉRIFIER]` détails.

### 6.3 Sessions abandonnées et reprises

- **`cleanup-abandoned-sessions`** (cron `0 * * * *`) : pour chaque session `pending` ou `in_progress` sans activité depuis 2 h :
  - Si le dossier `interviews/{sessionId}/` contient déjà des fichiers : tente `finalize-abandoned-session` pour récupérer la session.
  - Sinon : supprime fichiers, messages, session.
- **`send-abandon-reminders`** (cron `*/5 * * * *`) : pour chaque session `pending`/`in_progress`, non relancée, inactive depuis 30 min et créée il y a moins de 24 h : envoie un email `candidate-abandon-reminder` au candidat (template incluant le nom du projet et l'URL de reprise), pose `abandon_reminder_sent_at`. Idempotent via `idempotencyKey = abandon-reminder-{sessionId}`. Ignore les démos.
- **`finalize-abandoned-session`** : passe la session en `completed` malgré l'abandon si du contenu utile existe, déclenche la pipeline rapport.

### 6.4 RGPD et purges

- **`purge-old-videos`** : pour chaque session `completed_at < now()-12 mois` avec encore des URLs vidéo/audio : supprime les fichiers du bucket via `purgeSessionStorageFiles`, met à `null` les URLs sur la session, trace dans `data_purge_log` avec `source = cron_video_retention`.
- **`candidate-self-delete`** : depuis la page vie privée candidat. Supprime fichiers + messages + session + log.
- **`delete-session`** : variante recruteur (mêmes effets) — appelée depuis l'UI.

### 6.5 Emails (vue d'ensemble)

- **`send-transactional-email`** : point d'entrée unique. Reçoit `templateName`, `recipientEmail`, `idempotencyKey`, `templateData`, `replyTo?`, `metadata?`. Cherche le template dans le registre, applique l'override organisation éventuel, rend la version HTML + text, vérifie suppression, génère/réutilise un jeton de désabonnement, enqueue dans `transactional_emails` (file pgmq) via `enqueue_email`. Trace l'envoi dans `email_send_log`.
- **`process-email-queue`** : cron 5 sec env. ; lit jusqu'à `batch_size` messages depuis les files `auth_emails` puis `transactional_emails`. Envoie via le fournisseur email (Mailgun via une API interne). Respecte `Retry-After`. Sur 5 échecs ou TTL expiré → DLQ.
- **`handle-email-unsubscribe`** : valide et consomme un jeton de désinscription ; ajoute l'email à `suppressed_emails`.
- **`handle-email-suppression`** : webhook bounces/plaintes → ajoute à `suppressed_emails`.
- **`check-email-failures`** : cron `[À VÉRIFIER]` ; agrège les échecs sur la fenêtre `email_alert_config`, si supérieur au seuil envoie un email `email-failure-alert` (avec cooldown).
- **`get-email-template-defaults`** : renvoie les valeurs par défaut d'un template pour pré-remplir l'éditeur d'overrides.
- **`preview-transactional-email`** : rend un template avec `previewData` pour l'éditeur.
- **`auth-email-hook`** : appelé par le système d'auth (signup, magic link, recovery, invite, email change, reauthentication). Enqueue dans `auth_emails` une version rendue via les templates `_shared/email-templates/`.
- **`retry-email`** : remet un envoi échoué en file.
- **`send-weekly-recaps`** : cron `[À VÉRIFIER]` ; pour chaque projet actif avec destinataires, agrège candidats de la semaine et envoie `weekly-project-recap` aux destinataires.

### 6.6 Invitations et magic links

- **`send-invitation`** : crée une `organization_invitation`, envoie l'email d'invitation (`invite`).
- **`redeem-magic-link`** : consomme un magic link utilisateur (non super admin).
- **`superadmin-magic-link`** : un super admin déclenche la création + envoi d'un magic link pour un email cible. Trace IP/utilisation.
- **`superadmin-impersonate`** : retourne un jeton permettant à un super admin de se connecter en tant qu'un autre utilisateur. La bannière d'impersonation est affichée tout le temps.

### 6.7 Super admin organisations

- **`superadmin-create-org`** : crée une organisation, son créateur, son premier admin. `[À VÉRIFIER]` : éventuelle copie des templates marqués `clone_to_new_orgs`.
- **`superadmin-delete-org`** : supprime en cascade.
- **`superadmin-manage-user`** : crée/modifie/supprime un utilisateur dans une organisation.
- **`admin-list-emails`** : alimente l'admin emails.

### 6.8 Voix clonées

- **`clone-voice`** : enregistre un échantillon, l'envoie à ElevenLabs, stocke `cloned_voice_id`, `cloned_voice_name`, `cloned_voice_created_at` sur le profil. Exige `cloned_voice_consent_at`.
- **`delete-cloned-voice`** : supprime côté ElevenLabs et dans le profil.

### 6.9 TTS

- **`tts-elevenlabs`** : génère un fichier audio depuis un texte + voice id ElevenLabs.
- **`tts-openai`** : équivalent OpenAI.
- **`tts-gemini-direct`** : équivalent Gemini.
- Les fonctions retournent l'audio (binaire ou data URI). Le client met en cache (`ttsCache`).

### 6.10 Partage de rapports

- **`consume-report-share`** : valide un `share_token` (actif, non expiré) ; si `viewer_secret` exigé, vérifie le mot de passe ; retourne le rapport. Pose `viewed_at`.

### 6.11 Statistiques et page publique

- **`track-project-view`** : insère une vue dans `project_page_views` ; déduplique par hash visiteur sur la journée.

### 6.12 Issue candidat

- **`report-interview-issue`** : formulaire de signalement candidat (problème technique). Envoie l'email `interview-issue-report` à l'équipe.

### 6.13 Imports IA

- **`import-job-offer`** : scrape une URL d'offre via Firecrawl, envoie le contenu à l'IA pour produire un brouillon de questions + critères pondérés (somme = 100). Détails en section 7.
- **`import-public-page-from-url`** : `[À VÉRIFIER]` — utilise probablement Firecrawl + IA pour pré-remplir la page publique d'un projet.

### 6.14 Backfills et maintenance

- **`backfill-orphan-reports`** : recrée des rapports manquants.
- **`backfill-report-timestamps`** : corrige les horodatages anciens.
- **`retry-missing-analyses`** : relance `analyze-paraverbal` / `analyze-nonverbal` pour les rapports où la section manque ou est en `failed`.
- **`replay-nonverbal-batch`** : relance par lots l'analyse non-verbale (super admin).
- **`cancel-session`** : passe une session en `cancelled`.

### 6.15 Conversation IA pendant l'entretien

- **`ai-conversation-turn`** (POST `{ messages, projectContext }`) : appelée à chaque tour pendant la session candidat. Décide `follow_up`/`next`/`end`, calcule un message court à dire (relance, transition, clôture). Garde-fous serveur :
  - `follow_up` interdit si quota dépassé, niveau `light`, relances désactivées, ou réseau dégradé (`forceMaxFollowUps = 0`).
  - `next` sur la dernière question → forcé en `end`.
  - `end` ailleurs → forcé en `next`.
  - Nettoyage de marqueurs interdits dans les messages.
  - Détails du prompt en section 7.

### 6.16 Copilote IA

- **`copilot-chat`** : voir détail prompts en section 7.

### 6.17 Jobs planifiés connus

| Nom | Fréquence | Cible | Effet |
|---|---|---|---|
| `cleanup-abandoned-sessions-hourly` | toutes les heures | `cleanup-abandoned-sessions` | Récupère ou purge les sessions abandonnées > 2 h |
| `send-abandon-reminders-every-5min` | toutes les 5 min | `send-abandon-reminders` | Envoie un email de relance unique |
| `process-email-queue` | ~ toutes les 5 sec `[À VÉRIFIER]` | fonction interne | Vidange des files auth + transactional |
| `process-report-queue` `[À VÉRIFIER]` | env. toutes les minutes | `process-report-queue` | Génère les rapports en attente |
| `purge-old-videos` `[À VÉRIFIER]` | quotidien | `purge-old-videos` | RGPD 12 mois |
| `check-email-failures` `[À VÉRIFIER]` | périodique | `check-email-failures` | Alerte échecs |
| `send-weekly-recaps` `[À VÉRIFIER]` | hebdomadaire | `send-weekly-recaps` | Recap par projet |

### 6.18 Triggers et fonctions SQL notables

- `is_super_admin`, `is_org_admin`, `is_org_member`, `get_user_organization_id`, `has_role` : SECURITY DEFINER, utilisées dans toutes les RLS.
- `enqueue_report_job(session_id)` : idempotent ; crée/réactive un `report_job` `queued`.
- `claim_report_jobs(limit, lock_ms)`, `mark_report_job_done`, `mark_report_job_failed`, `requeue_stuck_report_jobs` : verrouillage atomique.
- `enqueue_email(queue_name, payload)`, `read_email_batch`, `delete_email`, `move_to_dlq` : wrappers pgmq.


---

## 7. Intelligence artificielle

> Tous les appels passent par une passerelle IA unifiée au format compatible OpenAI (`/v1/chat/completions`) exposée par Lovable AI Gateway. Variable d'environnement : `LOVABLE_API_KEY`. Modes : tool calling, JSON mode, multimodal (audio/vidéo inline en base64).
> Une reconstruction sur un autre stack peut viser n'importe quel fournisseur compatible OpenAI tool calling + multimodal (Vertex AI / Gemini, Azure OpenAI…). Les modèles cités sont ceux référencés littéralement dans le code.

### 7.1 Conversation IA pendant l'entretien — `ai-conversation-turn`

**Modèle :** `google/gemini-2.5-flash`
**Format de sortie :** JSON `{ "action": "follow_up" | "next" | "end", "message": "…" }` (mode `response_format: json_object` + fallback regex côté serveur).

**Prompt système** (variables injectées en français, reproduit mot à mot) :

```
Tu es ${aiPersonaName}, recruteuse IA pour le poste "${jobTitle}".

CONTEXTE :
- Question actuelle : ${n}/${N}
- Niveau de relance : ${relanceLevel}
- Relances déjà posées sur cette question : ${followUpsAsked} / ${maxFollowUps} max
- Dernière réponse du candidat : ${wordCount} mots
- Dernière question posée : « ${currentQ.content} »
${isLastQuestion ? "- C'est la DERNIÈRE question." : `- Question suivante : [${TEXTE|AUDIO|VIDÉO}] « ${nextQ.content} »`}
- Transitions vocales activées : ${OUI|NON}

TA TÂCHE : Décider, en fonction de la qualité de la dernière réponse du candidat, si tu poses une RELANCE sur la question actuelle, ou si tu PASSES à la question suivante (ou tu termines si c'est la dernière).

RÈGLES STRICTES :
1. Tu dois répondre UNIQUEMENT en JSON valide, format exact :
   {"action":"follow_up"|"next"|"end","message":"texte court à dire au candidat"}
2. action = "follow_up" UNIQUEMENT si la réponse du candidat mérite vraiment d'être creusée (réponse vague, incomplète, manque d'exemple, point ambigu). Si la réponse est claire et suffisante, passe à la suite.
3. Si niveau de relance = "light" → action = "next" obligatoirement (jamais de relance).
4. Si relances déjà posées >= max (${maxFollowUps}) → action = "next" obligatoirement.
5. Si relances désactivées sur cette question → action = "next" obligatoirement.
6. Si c'est la DERNIÈRE question et que tu ne relances pas → action = "end".
7. Le "message" :
   - Pour "follow_up" : UNE seule question courte de relance (max 2 phrases) qui creuse un point précis de sa réponse. Ne dis JAMAIS « question suivante », « passons à la suite », « écoutez », « regardez ». Pas de "Merci".
   - Pour "next" :
     [si transitions activées]
       2 phrases maximum, en deux temps :
       a) UN mini-rebond personnalisé (1 phrase courte) sur la dernière réponse du candidat, qui reprend un mot-clé ou une idée concrète qu'il vient de mentionner. Varie à chaque tour : pas de « Merci » mécanique, pas de flatterie ("super", "excellent", "parfait"), pas de paraphrase mot pour mot. Si la dernière réponse est vide, hors sujet ou inintelligible, SAUTE le rebond.
       b) Une annonce naturelle de la question suivante :
          - Si la question suivante est en TEXTE : pose-la directement après le rebond, sans formule du type « question suivante ».
          - Si elle est AUDIO : invite à l'écouter avec une formulation libre et variée (ex. « Écoutons la suivante. », « Place à l'audio. », « Voici la prochaine, à l'oreille. »). N'utilise pas toujours la même formule.
          - Si elle est VIDÉO : invite à la regarder avec une formulation libre et variée (ex. « Regardons la suivante. », « Place à la vidéo. », « Voici la prochaine, en images. »).
       Reste professionnel, chaleureux mais sobre, jamais robotique.
     [si transitions désactivées]
       transitions désactivées : "message" doit être une chaîne vide ("").
   - Pour "end" : remerciement bref (1 phrase) indiquant la fin de la session.
8. Toujours en français, professionnel et chaleureux.
9. N'invente JAMAIS de question hors de la liste fournie.

Réponds UNIQUEMENT avec le JSON, sans texte avant ni après, sans bloc ```.
```

**Garde-fous serveur après réponse** (résumés) :
- `follow_up` non autorisé → forcé à `end` si dernière question, sinon `next`.
- `next` sur la dernière question → forcé à `end`.
- `end` ailleurs → forcé à `next`.
- Si le message d'une relance contient un marqueur de transition (« question suivante », « écoutez », « regardez », « passons à »), il est remplacé par : *"Pouvez-vous développer un peu plus ? Donnez-moi un exemple concret si possible."*
- Si le message d'un `end` contient un marqueur de transition ou est vide, il est remplacé par : *"Merci pour cette session, à bientôt."*

**Usage / stockage :**
- Le `message` est joué au candidat via TTS (et inséré comme `session_message` rôle `ai`, `is_follow_up = (action === "follow_up")`).
- `action = end` déclenche la clôture côté client puis l'appel à `finalize-session`.

### 7.2 Transcription audio/vidéo — `transcribe-session`

**Modèle :** `google/gemini-2.5-flash`
**Format multimodal :** prompt texte + segment audio/vidéo en `data:{mime};base64` (inline ≤ 18 Mo, sinon le segment est marqué `too_large`).

**Prompt utilisateur (statique) :**

```
Tu es un transcripteur professionnel.
Transcris EXACTEMENT ce que dit la personne dans cette vidéo/audio, en français, avec des horodatages précis.

Règles strictes :
- Verbatim : garde les mots exacts, n'invente rien, ne reformule pas, ne corrige pas le sens.
- Supprime UNIQUEMENT les répétitions involontaires consécutives identiques.
- Ponctuation correcte, majuscules en début de phrase.
- Découpe en segments courts (1 phrase ou ~5 secondes max).
- Les horodatages sont en SECONDES depuis le début du média (0 = début).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans bloc markdown, au format :
{"segments":[{"start":0.0,"end":3.4,"text":"..."},{"start":3.4,"end":7.1,"text":"..."}]}

Si aucune parole audible : {"segments":[]}
```

**Schéma de sortie :** `{ segments: [{ start: number, end: number, text: string }] }`.

**Usage :**
- `content` de `session_messages` = concaténation des `text` de tous les segments.
- `content_raw` = sauvegarde de l'ancienne valeur (typiquement la version libre tapée ou la précédente transcription).
- `transcript_segments` = liste horodatée brute.
- `transcription_status` : `pending` → `processing` → `done`/`skipped` (segments vides)/`too_large`/`failed`.
- Préférence : si un fichier audio existe, on l'utilise ; sinon le fichier vidéo.
- Plafond : 8 segments par appel. Limite candidats : seuls les segments candidats avec média.
- Sécurité : si Authorization est fourni, l'appelant doit être membre de l'organisation du projet.

### 7.3 Rapport principal — `generate-report`

**Modèles, dans l'ordre :**
1. `google/gemini-2.5-pro` (tentative 1)
2. `google/gemini-2.5-pro` (retry — 502 fréquent côté provider)
3. `google/gemini-2.5-flash` (fallback)

Tool calling forcé sur une fonction unique `generate_report`. Outputs stockés en JSON dans plusieurs colonnes/champs de `reports`.

**Prompt système (mot à mot) :**

```
Tu es un expert en recrutement qui produit des RAPPORTS DE DÉCISION pour des recruteurs pressés.
Ton objectif n'est pas de produire une analyse exhaustive : c'est d'aider à prendre une décision claire (shortlister, creuser, ou rejeter) en moins de 2 minutes de lecture.
Tu es factuel, direct, et tu cites systématiquement le candidat pour appuyer chaque affirmation.
Tu n'utilises JAMAIS de jargon RH ou psy : tu parles le langage d'un manager qui recrute.
```

**Prompt utilisateur (template, variables `${...}`) :**

```
Analyse cette transcription d'entretien pour le poste de ${project.job_title}.

Candidat : ${session.candidate_name}

Questions posées :
${"1. ... (type: open)\n2. ..." }

Critères du poste (à utiliser pour fit_breakdown) :
${"- <label> (poids: <w>%, échelle: <0-5|0-10>): <description>" | "Aucun critère spécifique défini. Évalue sur: communication, pertinence des réponses, motivation, compétences techniques."}

Transcription complète :
${fullText}

Messages du candidat avec identifiants (à utiliser dans message_id / evidence_message_id) :
${"[id=<uuid>] <texte du message candidat>" }

Règles ABSOLUES :
1. Chaque affirmation (driver, fit, signal, dimension de communication) doit s'appuyer sur une citation EXACTE du candidat avec son message_id.
2. N'invente jamais un message_id : si tu ne peux pas citer, omets le champ.
3. Si la transcription est trop courte ou vague pour conclure, dis-le explicitement plutôt que d'inventer.
4. Pas de jargon RH/psy dans verdict_headline, decision_drivers, fit_breakdown.statement, signals : du français concret de manager.
5. À chaque fois que tu fournis un message_id (ou evidence_message_id), fournis aussi start_seconds : la seconde approximative où commence la phrase citée DANS la réponse vidéo (0 = début). Le serveur recalculera ensuite l'horodatage exact à partir de la transcription : ton estimation sert de filet de secours.

Produis un rapport orienté DÉCISION en utilisant l'outil generate_report.

Champs prioritaires :
- verdict_headline : UNE phrase max 100 caractères qu'un recruteur dirait à son manager. Pas une description, un verdict ("Profil senior solide, à valider sur la dimension management").
- recommendation : strong_yes / yes / maybe / no
- decision_drivers : 2 à 4 raisons CLÉS de cette reco. Chacune = label court (max 80 car), sentiment (positive/neutral/negative), citation + message_id.
- fit_breakdown : UNE entrée par critère du poste (utilise le label exact). score 0-100, level (excellent/solid/partial/gap), statement (1 phrase concrète "Maîtrise X mais aucune expérience démontrée sur Y"), citation + message_id.
- signals : signaux à creuser ou questions à reposer en entretien physique. Chacun = label, severity, description, citation, ET suggested_question (la question précise à poser pour lever le doute).
- communication_profile : scores 0-10 sur clarity, structure, concision, posture, energy. Chaque dim a un commentaire 1 ligne et idéalement une citation.
- question_evaluations : OBLIGATOIRE. Tu DOIS retourner UNE entrée pour CHAQUE question posée (indexée par "0","1","2"… dans l'ordre des questions ci-dessus), même si la réponse du candidat est vague, courte, hors-sujet ou absente. Ne saute jamais une question. Pour chaque question : question (texte exact), score 0-10 (voir grille ci-dessous), summary (1 phrase qui résume la réponse du candidat), comment (1-2 phrases d'analyse), key_quote, evidence_message_id, depth_level (surface/concret/expert), had_followup (true si une relance a été déclenchée), followup_helped (true si la relance a fait progresser la réponse).
  Grille de notation /10 (selon ton impression globale : clarté + pertinence + profondeur) :
  • 1-3 : réponse absente, hors-sujet, ou très superficielle
  • 4-6 : réponse correcte mais générique, peu d'exemples concrets
  • 7-8 : réponse claire avec exemples concrets et structure
  • 9-10 : réponse experte, structurée, démonstrative

Champs secondaires (toujours produits, format inchangé) :
- executive_summary : 3-5 phrases bilan global
- overall_score : 0-100 (cohérent avec recommendation)
- overall_grade : A/B/C/D/E
- personality_profile (Big Five) : OBLIGATOIRE. Tu dois TOUJOURS retourner les 5 traits (openness, conscientiousness, extraversion, agreeableness, emotional_stability) avec un score 0-100 et une confidence (low/medium/high). Si la transcription est courte ou les indices faibles, mets confidence à "low" et un score neutre proche de 50, mais ne saute jamais ce bloc. Fournis 1 à 2 evidences par trait quand c'est possible.
- soft_skills : 3 à 6 entrées avec quote + evidence_message_id obligatoires.
- highlights : 3 moments forts à montrer. Chaque entrée : question_index (0-based), kind (force/personnalite/vigilance), label (max 60 car), why, start_seconds / end_seconds DANS la réponse vidéo de la question (commence à 0, durée 10-30 s). Diversifie les kinds.
```

**Schéma de l'outil `generate_report` (sortie JSON imposée) :**

- `verdict_headline` *(string, ≤100 c)* — requis
- `decision_drivers` *(array)* — requis ; items `{ label, sentiment ∈ [positive,neutral,negative], quote, message_id, start_seconds }` (label + sentiment requis).
- `fit_breakdown` *(array)* — requis ; items `{ criterion, score 0-100, level ∈ [excellent,solid,partial,gap], statement, quote, message_id, start_seconds }` (criterion + score + statement requis).
- `signals` *(array)* — items `{ label, description, severity ∈ [low,medium,high], quote, message_id, start_seconds, suggested_question }`.
- `communication_profile.{clarity,structure,concision,posture,energy}` : `{ score 0-10, comment, quote, message_id, start_seconds }`.
- `executive_summary` *(string)* — requis.
- `overall_score` *(number 0-100)* — requis.
- `overall_grade` *(enum A,B,C,D,E)*.
- `recommendation` *(enum strong_yes,yes,maybe,no)* — requis.
- `question_evaluations` *(map<string, {question, score 0-10, summary, comment, key_quote, evidence_message_id, evidence_start_seconds, depth_level ∈ [surface,concret,expert], had_followup:bool, followup_helped:bool}>)* — requis.
- `personality_profile` *(Big Five)* — requis ; pour chaque trait `{ score 0-100, interpretation, confidence ∈ [low,medium,high], evidences[] }`.
- `soft_skills` *(array)* — items `{ skill, score 0-10, quote, evidence_message_id, evidence_start_seconds }`.
- `highlights` *(array)* — items `{ question_index, kind ∈ [force,personnalite,vigilance], label, why, start_seconds, end_seconds }` (tous requis).

**Validation et réparation :**
- Validation stricte avant acceptation : `fit_breakdown` non vide ; `personality_profile` complet avec ≥ un score > 0.
- **Planchers anti-aberration** : un critère `fit` avec score < 20 et statement < 20 caractères, ou un trait Big Five avec score < 20 sans `confidence = "low"`, est considéré récupérable.
- **Passes de réparation ciblées** : pour chaque anomalie, un appel `gemini-2.5-pro` dédié rééavalue uniquement le critère / trait concerné (jusqu'à 2 essais), avec un mini-prompt explicite. Trace dans `stats.report_anomalies` si la réparation échoue.

**Pipeline d'écriture :**
- `fit_breakdown` est remappé sur les critères réels du projet (label exact, puis index).
- `fit_score` global = moyenne pondérée par poids critères (×100).
- Score final stocké = moyenne du score IA global et du `fit_score` (méthode `hybrid_v1`).
- `criteria_scores` legacy reconstruit pour compatibilité (score arrondi sur l'échelle du critère).
- `start_seconds` recalculés par méthode proportionnelle (position du 1er mot de la citation dans la transcription du message, ramenée à la durée du clip) via `resolve-start-seconds.ts`. Aucun fallback IA.
- `question_evaluations` : garantit une entrée par question. Si l'IA en a omis, **retry ciblé** (`gemini-2.5-flash`, tool `evaluate_questions`) avec prompt :
  ```
  Tu as oublié d'évaluer certaines questions de cet entretien. Évalue MAINTENANT, et seulement, les questions ci-dessous, en te basant sur la transcription.
  
  Candidat : ${name}
  Poste : ${jobTitle}
  
  Questions à évaluer (index → texte) :
  ${index. texte}
  
  Transcription complète :
  ${fullText}
  
  Pour chaque question, retourne :
  - question (texte exact)
  - score 0-10 (1-3 absente/hors-sujet, 4-6 générique, 7-8 claire avec exemples, 9-10 experte)
  - summary (1 phrase qui résume la réponse)
  - comment (1-2 phrases d'analyse)
  - key_quote (citation exacte si possible)
  - depth_level (surface/concret/expert)
  
  Note selon ton impression globale (clarté + pertinence + profondeur). Ne saute aucune question listée.
  ```
- `audio_health` calculé : un segment est silencieux si transcript < 5 caractères ou peak_rms < 0.05 ; `failed` si > 80 % silencieux, `degraded` si > 30 %, sinon `ok`.
- `highlight_clips` : sélection de 3 clips, déduplique sur les questions, fenêtre 10-30 s.

**Garde-fous d'entrée :**
- Sessions démo (`is_demo`) ignorées.
- Aucun enregistrement candidat → erreur `no_recordings`.
- Si des segments candidats n'ont pas encore été transcrits, lance jusqu'à 15 itérations de `transcribe-session` avant d'abandonner (avec tolérance : ≥70 % terminaux et ≥3 `done` → on génère partiellement).
- Si transcript total candidat < 200 caractères pour > 120 s de session → erreur `transcript_incomplete` (HTTP 422) pour éviter un rapport à 0/100.

**Email recruteur :** après écriture du rapport, déclenche `analyze-paraverbal` et `analyze-nonverbal` en parallèle ; quand les deux ont rendu (succès ou non), construit l'email `interview-report` enrichi des deux analyses et l'enqueue pour chaque destinataire de `report_recipient_user_ids` (filtré sur la même organisation, suppression / unsubscribe respectés, `reply_to` = email candidat si valide). Si la liste est vide, **aucun email** n'est envoyé (opt-out volontaire).

### 7.4 Analyse para-verbale (voix) — `analyze-paraverbal`

**Modèle :** `google/gemini-2.5-flash`
**Inputs :** jusqu'à 8 segments audio candidats inline base64 (≤ 20 Mo chacun), avec transcription jointe.
**Tool :** `report_paraverbal` (forcé).

**Prompt système (mot à mot) :**

```
Tu es un coach vocal. Analyse uniquement la dimension PARA-VERBALE (la voix elle-même, pas le contenu) des réponses du candidat ${candidateName} pour le poste ${jobTitle}.
Tu écoutes l'audio fourni en plus de la transcription. Note 6 dimensions sur 10 :
- fluency (débit, articulation)
- hesitation (peu d'« euh » = note haute)
- intonation (vivante vs monotone)
- energy (engagement vocal)
- vocal_confidence (assurance)
- vocal_stress (10 = aucun stress audible)
Pour chaque dimension : 1 phrase concrète (langage manager, sans jargon) ET, dès que possible, l'evidence du segment le plus représentatif : evidence_message_id, evidence_start_seconds (position EN SECONDES depuis le début de la réponse correspondante, pas depuis le début de l'entretien) et evidence_quote (≤ 20 mots tirés de la transcription à ce moment). Ces 3 champs sont fortement encouragés pour permettre au recruteur de sauter directement au moment clé dans la vidéo.
Retourne le résultat via l'outil report_paraverbal.
```

**Schéma de sortie :** `{ paraverbal_profile: { fluency, hesitation, intonation, energy, vocal_confidence, vocal_stress }, summary }` ; chaque dimension : `{ score 0-10, comment, evidence_message_id, evidence_start_seconds, evidence_quote }`.

**Effets :** stocke dans `reports.paraverbal_analysis` un objet `{ status: ok|skipped|failed|rate_limited|no_credits|running, attempt, profile, summary, segments_analyzed, generated_at, model }`. 3 tentatives max. Retries 2s/5s sur 5xx. Skip si `audio_analysis_enabled = false`.

### 7.5 Analyse non-verbale (corps) — `analyze-nonverbal`

**Modèle :** `google/gemini-2.5-pro`
**Inputs :** jusqu'à 4 segments vidéo (≤ 6 Mo chacun, plafond global 20 Mo), répartis également (début/milieu/fin).
**Tool :** `report_nonverbal` (forcé).

**Prompt système (mot à mot) :**

```
Tu es un expert en communication non-verbale en entretien d'embauche VIDÉO À DISTANCE (le candidat répond à un avatar IA affiché à l'écran). Analyse uniquement la dimension CORPORELLE (regard, posture, gestes, visage) du candidat.

Note 4 dimensions sur 10 :
- eye_contact : présence et stabilité du regard. ATTENTION : dans ce format, le candidat regarde l'avatar À L'ÉCRAN, pas la lentille de la caméra. Un regard orienté vers l'écran de façon stable et engagée = 8-10. Ne pénalise que les vraies fuites de regard (plafond, sol, côté répété, lecture visible de notes). Ne JAMAIS pénaliser le fait de ne pas fixer la caméra : c'est attendu dans ce format.
- posture (10 = ouverte, droite, stable)
- gestures (10 = expressive et adaptée, ni figée ni agitée)
- facial_expressivity (10 = visage vivant et congruent)

GRILLE D'ÉVALUATION — utilise TOUTE la plage, pas seulement 4-6 :
- 10 : exceptionnel, niveau commercial/média
- 8-9 : très bon, naturel et engageant (cible standard d'un bon candidat)
- 6-7 : correct, quelques points d'amélioration mineurs (MOYENNE ATTENDUE d'un candidat normal)
- 4-5 : inconfort ou rigidité visible, sans bloquer la communication
- 2-3 : gêne marquée qui nuit clairement à l'échange
- 0-1 : extrêmement problématique
Un candidat "moyen normal" se situe à 6-7, PAS à 5. N'utilise pas 5 par défaut. Si rien de clairement négatif n'est observable, la note est ≥7.

Pour chaque dimension : 1 phrase concrète ET, dès que possible, l'evidence du segment vidéo le plus représentatif : evidence_message_id, evidence_start_seconds (position EN SECONDES depuis le début de la réponse correspondante, pas depuis le début de l'entretien) et evidence_quote (≤ 20 mots décrivant factuellement ce qui s'observe à ce moment précis, ou courte citation du candidat). Ces 3 champs permettent au recruteur de sauter directement au moment clé dans la vidéo.
Identifie ensuite jusqu'à 3 micro-tensions notables (raideur, fuite du regard répétée, geste parasite récurrent…). Pour chacune : message_id, description factuelle (1 phrase) et start_seconds (position en secondes depuis le début de la réponse). S'il n'y en a pas, retourne une liste vide.

Ne juge JAMAIS l'apparence physique, l'âge, le genre, l'origine ou le handicap. Reste factuel et bienveillant.
Retourne le résultat via l'outil report_nonverbal.
```

**Schéma de sortie :** `{ nonverbal_profile: { eye_contact, posture, gestures, facial_expressivity }, micro_tensions: [{message_id, description, start_seconds}], summary }` ; chaque dimension : `{ score 0-10, comment, evidence_message_id, evidence_start_seconds, evidence_quote }`.

**Effets :** stocke dans `reports.nonverbal_analysis` `{ status, profile, micro_tensions, summary, attempt, ... }`. 3 tentatives max. Skip si `record_video = false` ET aucun segment vidéo n'a été réellement uploadé.

### 7.6 Copilote IA — `copilot-chat`

**Modèle :** `google/gemini-3-flash-preview`
**Historique :** 30 derniers messages du fil.
**Mode :** chat libre (pas de tool calling), réponse en Markdown.

#### 7.6.1 Mode analyse (prompt système, mot à mot, lignes générées) :

```
Tu es un assistant IA expert en recrutement, sobre, factuel, qui aide un recruteur à analyser les candidatures du projet "${project.title}" (poste : ${project.job_title}).
Réponds toujours en français, de façon concise et structurée (Markdown : titres courts, listes, tableaux quand pertinent).
Appuie tes réponses uniquement sur les données fournies ci-dessous. Si tu n'as pas l'info, dis-le clairement.
Cite toujours les candidats par leur nom. Refuse poliment toute comparaison fondée sur des critères discriminatoires (origine, âge, genre, religion, apparence physique, situation familiale, etc.).

## Critères d'évaluation du projet
- **<label>** (poids <w>) : <description>
…

## Candidats évalués (<N>)
### <Nom candidat>
- Score global : **<X>/10** (<grade>)
- Recommandation IA : <strong_yes|yes|maybe|no>
- Décision recruteur : <decision>
- Résumé : <executive_summary_short ou 400 premiers caractères de executive_summary>
- Forces : <jusqu'à 5 strengths, séparés par " ; ">
- Axes d'amélioration : <jusqu'à 5 areas_for_improvement, séparés par " ; ">
- Scores critères : <jusqu'à 8 entrées "label: score" séparées par " · ">
- Soft skills : <jusqu'à 6 entrées "skill: score" séparées par " · ">
- Points de vigilance : <jusqu'à 3 red_flags>
- Note du recruteur : <recruiter_note, 200 premiers caractères>
```

#### 7.6.2 Mode design (prompt système, mot à mot) :

```
Tu es un assistant IA expert en conception d'entretiens structurés. Tu aides un recruteur à construire l'entretien du projet "${project.title}" (poste : ${project.job_title}, langue : ${project.language}, durée cible : ${project.max_duration_minutes} min).
Réponds toujours en français, de façon concise et structurée (Markdown : titres courts, listes, tableaux). Justifie brièvement chaque suggestion (« pourquoi »).
Privilégie des questions ouvertes, comportementales (méthode STAR) et alignées sur le poste. Refuse toute question discriminatoire (origine, âge, genre, religion, situation familiale, etc.).
**Très important** : à chaque fois que tu proposes des éléments concrets activables (questions ou critères), ajoute en plus de ton explication un bloc de code Markdown ```json (et seulement ces blocs au format suivant) que l'application parsera pour afficher des boutons d'ajout :
```json
{ "type": "questions_suggestion", "items": [ { "title": "Titre court", "content": "Énoncé complet de la question", "type": "open", "rationale": "pourquoi cette question" } ] }
```
```json
{ "type": "criteria_suggestion", "items": [ { "label": "Nom du critère", "description": "Ce qu'on évalue concrètement", "weight": 10, "rationale": "pourquoi ce critère" } ] }
```
Chaque bloc JSON doit être valide et autonome. Tu peux mettre plusieurs blocs dans une même réponse. N'invente pas d'autres types.

## Projet
- Description : <project.intro_text, 600 premiers caractères>

## Questions actuelles du projet (<N>)
<idx>. **<titre>** — <énoncé> _(type: <type>, relances: <oui (n) | non>)_

## Critères d'évaluation actuels (<N>)
- **<label>** (poids <w>) : <description>

## Bibliothèque de questions de l'organisation (échantillon de <N>)
- <titre> _[<catégorie>]_ — <énoncé tronqué>

## Bibliothèque de critères de l'organisation (échantillon de <N>)
- **<label>** _[<catégorie>]_ — <description tronquée>
```

**Effets :** message utilisateur et réponse insérés dans `copilot_messages`. Si le fil s'appelle encore `Nouvelle conversation`, son titre est remplacé par les 60 premiers caractères du premier message utilisateur.

### 7.7 Import d'offre d'emploi — `import-job-offer`

**Étape 1 :** scrape via service externe Firecrawl (`https://api.firecrawl.dev/v2/scrape`, format markdown, `onlyMainContent: true`, clé `FIRECRAWL_API_KEY`). Tronqué à 12 000 caractères.

**Étape 2 — IA :**
- Modèle : `google/gemini-2.5-flash`
- Tool : `build_interview_draft` (forcé), schéma : `{ title, questions: [{title, content}], criteria: [{label, description, weight}] }` avec `minItems = maxItems = questionsCount/criteriaCount`.
- Normalisation serveur : poids renormalisés sur 100 si écart > 1.

**Prompt système (mot à mot) :**

```
Tu es un expert en recrutement et en conduite d'entretiens en français.
À partir d'une offre d'emploi réelle, tu génères un entretien de pré-sélection sur-mesure.

Structure obligatoire de la liste de questions (dans cet ordre) :
1. Une question d'introduction chaleureuse pour mettre le candidat à l'aise (ex : "Bonjour, comment allez-vous aujourd'hui ? Prenez un instant pour vous présenter brièvement.").
2. Les questions du cœur de l'entretien : ouvertes, comportementales ou de mise en situation, SPÉCIFIQUES à l'offre (missions, compétences, secteur, environnement).
3. Une question de conclusion qui ouvre la parole au candidat (ex : "Avez-vous un dernier mot à ajouter, ou une question à nous poser ?").

Règles strictes :
- Le nombre total de questions doit être exactement celui demandé (intro + cœur + conclusion compris).
- Pas de questions génériques type "parlez-moi de vous" ou "quelles sont vos qualités" dans le cœur de l'entretien.
- Les critères d'évaluation sont calibrés sur les compétences clés de l'offre.
- Somme des poids des critères = exactement 100.
- Tout en français.
```

**Prompt utilisateur (template) :**

```
Voici une offre d'emploi extraite d'une page web :

---
${markdownExtrait}
---

Génère :
- un titre court pour le projet d'entretien (intitulé de poste + entreprise si trouvée)
- exactement ${questionsCount} questions au total : la 1re est une question d'introduction (brise-glace), la dernière est une question de conclusion, les ${questionsCount-2} du milieu sont personnalisées à l'offre
- exactement ${criteriaCount} critères d'évaluation pondérés (somme = 100)
```

### 7.8 Import de page publique depuis URL — `import-public-page-from-url`

`[À VÉRIFIER]` : utilise probablement Firecrawl + un appel IA similaire pour pré-remplir le contenu de la page publique d'un projet. Fonction présente, prompt non détaillé ici.

### 7.9 Récapitulatif des fournisseurs IA externes

| Usage | Modèle / service | Variable d'env |
|---|---|---|
| Conversation entretien | Lovable AI Gateway → Gemini 2.5 Flash | `LOVABLE_API_KEY` |
| Transcription audio/vidéo | Lovable AI Gateway → Gemini 2.5 Flash (multimodal) | `LOVABLE_API_KEY` |
| Génération rapport | Lovable AI Gateway → Gemini 2.5 Pro (fallback Flash) | `LOVABLE_API_KEY` |
| Analyse para-verbale | Gemini 2.5 Flash | `LOVABLE_API_KEY` |
| Analyse non-verbale | Gemini 2.5 Pro | `LOVABLE_API_KEY` |
| Copilote | Gemini 3 Flash Preview | `LOVABLE_API_KEY` |
| Import offre | Gemini 2.5 Flash | `LOVABLE_API_KEY` |
| Scrape pages web | Firecrawl v2 | `FIRECRAWL_API_KEY` |
| TTS (voix IA) | ElevenLabs / OpenAI / Gemini (au choix) ; cache navigateur | `ELEVENLABS_API_KEY` `[À VÉRIFIER]`, `OPENAI_API_KEY` `[À VÉRIFIER]`, `GEMINI_API_KEY` `[À VÉRIFIER]` |
| Clonage voix | ElevenLabs | `ELEVENLABS_API_KEY` `[À VÉRIFIER]` |

---

## 8. Authentification et comptes

### 8.1 Méthodes de connexion

- **Email + mot de passe** (par défaut).
- **Lien magique** demandé sur `/auth/magic-link`, consommé sur `/m/:token`.
- **Magic link super admin** : un super admin peut générer un lien à durée limitée pour n'importe quel email (table `superadmin_magic_links`), envoyé par email.
- **Aucune inscription publique anonyme** : un compte ne peut être créé qu'en consommant une invitation (`/invite/:token`) ou via la console super admin.

### 8.2 Récupération de mot de passe

- Page `/reset-password` envoie un email de recovery basé sur le template `recovery.tsx`. Validité : 15 minutes (TTL auth par défaut).

### 8.3 Inscription par invitation

- Un admin d'organisation ou un super admin crée une `organization_invitation` (jeton 32 octets hex, expiration 7 jours).
- L'email d'invitation pointe sur `/invite/:token`. La policy RLS autorise un accès anonyme à l'invitation tant qu'elle est `pending` et non expirée.
- L'utilisateur crée un mot de passe ; à l'acceptation, il est rattaché à l'organisation (`organization_members`), un profil est créé, et l'invitation passe en `accepted`.

### 8.4 Rôles et permissions

- Rôles stockés exclusivement dans `user_roles` (jamais sur `profiles`), avec un enum `app_role`.
- Fonction `has_role(user, role)` SECURITY DEFINER utilisée par les policies pour éviter les boucles RLS.
- Permissions par rôle :
  - **Super admin** : accès cross-organisations, création/suppression d'organisations, impersonation, magic links, files système, monitoring email, super admin pages.
  - **Admin d'organisation** : gestion des membres, invitations, et de la configuration de son organisation.
  - **Membre** (recruteur standard) : CRUD sur projets, sessions, bibliothèques, rapports, copilote dans son organisation.
  - **Candidat anonyme** (non authentifié) : passe les entretiens via jetons publics et lit la page publique des projets actifs.

### 8.5 Impersonation

- Un super admin appelle `superadmin-impersonate` ; reçoit un jeton lui permettant d'agir en tant qu'un autre utilisateur.
- Une **bannière permanente** est affichée tant que l'impersonation est active, avec un bouton pour la quitter.

### 8.6 Suppression de compte

- Pas d'auto-suppression utilisateur dans l'UI vue. `[INCOMPLET]` : un utilisateur ne peut pas supprimer son compte lui-même via une page dédiée.
- Suppression par un super admin via `superadmin-manage-user`.
- Un candidat (non utilisateur) peut supprimer SA session et ses fichiers via `/session/:slug/privacy/:token`.

---

## 9. Fichiers et médias

### 9.1 Bucket `media`

- Bucket de stockage public en lecture (URLs directes utilisables dans le navigateur).
- Préfixe par session : `interviews/{sessionId}/...` contenant :
  - chunks vidéo (par segment et par réponse),
  - fichiers audio extraits (préférés pour la transcription),
  - thumbnails,
  - manifestes de chunks vidéo (json),
  - CV et lettre de motivation candidat (sous une sous-clé `[À VÉRIFIER]`).
- Insertion possible côté candidat anonyme dans son propre préfixe (policy storage).
- Suppression coordonnée via `_shared/session-storage-cleanup.ts` (`purgeSessionStorageFiles` + `nullifySessionMediaUrls`).
- Limites de taille effectives (pas de limites RLS, limites applicatives) :
  - Transcription inline : ≤ 18 Mo par segment.
  - Analyse para-verbale : ≤ 20 Mo par segment audio, 8 segments max.
  - Analyse non-verbale : ≤ 6 Mo par segment vidéo, plafond global 20 Mo, 4 segments max.
- Rétention : 12 mois après `completed_at`, le contenu vidéo/audio est purgé par cron RGPD.

### 9.2 Bucket `tutorials`

- Bucket public en lecture.
- Écriture super admin uniquement.
- Sert le contenu de la page tutoriel.

### 9.3 Avatars, intros, logos

- **Logos d'organisation** : upload via `OrgLogoUpload`, stocké sur `media` `[À VÉRIFIER]` (sous-préfixe).
- **Avatars de projet / question** : images uploadées, URL stockée dans `projects.avatar_image_url`, `questions.avatar_image_url`.
- **Médias de question** : vidéo et audio préenregistrés par le recruteur, URLs dans `questions.video_url` / `questions.audio_url`.
- **Intros** : `intro_audio_url`, `intro_text`, idem pour les templates.
- **Voix clonées** : aucun fichier stocké côté Interw — l'identifiant ElevenLabs est stocké sur le profil. La voix elle-même réside chez ElevenLabs.

### 9.4 Export vidéo MP4

- Réalisé côté client (page `/sessions/:id/export`) avec `ffmpeg-core.js` (`public/ffmpeg/`) dans un worker. Aucune dépendance serveur. Sortie : un MP4 téléchargeable.

---

## 10. Emails transactionnels

> Tous les emails de l'application passent par une file pgmq (`auth_emails`, `transactional_emails`) consommée toutes les 5 secondes par `process-email-queue`. Le domaine d'envoi est `notify.interw.ai` ; expéditeur `hello@notify.interw.ai`, marque "Interw". Tous les corps sont rendus depuis des templates React Email et incluent un pied de page avec lien de désabonnement automatique. Idempotence par `idempotencyKey`.

### 10.1 Emails utilisateur (auth)

| Template | Déclencheur | Destinataire | Objet (par défaut) | Contenu résumé |
|---|---|---|---|---|
| `signup` | Création de compte (rare en production : pas d'inscription publique) | Utilisateur | "Confirmez votre compte" `[À VÉRIFIER]` | Lien de confirmation. |
| `magic-link` | Demande magic link | Utilisateur | "Votre lien de connexion" `[À VÉRIFIER]` | Lien unique de connexion. |
| `recovery` | Reset mot de passe | Utilisateur | "Réinitialiser votre mot de passe" `[À VÉRIFIER]` | Lien de reset (TTL 15 min). |
| `invite` | Invitation à rejoindre une organisation | Email invité | "Vous êtes invité chez <org>" `[À VÉRIFIER]` | CTA vers `/invite/:token`. |
| `email-change` | Changement d'email | Nouvelle adresse | "Confirmez votre nouvelle adresse" `[À VÉRIFIER]` | Lien de confirmation. |
| `reauthentication` | Étape de réauthentification | Utilisateur | "Confirmez votre identité" `[À VÉRIFIER]` | Code ou lien. |

### 10.2 Emails applicatifs (registry `transactional-email-templates`)

| Template | Déclencheur | Destinataire | Objet | Contenu résumé |
|---|---|---|---|---|
| `candidate-thank-you` | Fin du pipeline rapport (par session, idempotent) | Candidat | Personnalisable, défaut « Merci pour cet entretien : « <poste> » » | Remerciement, mention nom de l'organisation, lien vers la page vie privée pour gérer ses données. Le sujet et le corps peuvent être surchargés au niveau projet (`candidate_email_subject`/`body`) ou organisation (`candidate_message_templates` clé `candidate-thank-you`). Variables : `{firstName}`, `{jobTitle}`, `{orgName}`. |
| `candidate-abandon-reminder` | Cron `send-abandon-reminders` (1 fois par session, ≥ 30 min d'inactivité, < 24 h) | Candidat | « Reprenez votre entretien : <projet> » | Salutation, mention de l'abandon, CTA "Reprendre l'entretien" pointant sur l'URL nominative. |
| `interview-report` | Fin de `generate-report` (après analyses para+non verbale) | Chaque utilisateur listé dans `report_recipient_user_ids` du projet (filtré par organisation, suppression respectée) | « Rapport d'entretien : <candidat> – <poste> » `[À VÉRIFIER]` | Présentation du candidat, score global, recommandation, verdict en 1 phrase, résumé exécutif, drivers de décision, fit breakdown, soft skills, red flags, follow-up questions, scores critères et par question, profils para et non verbal résumés, lien vers le rapport complet. `reply_to` = email candidat si valide. |
| `bulk-candidate-message` | Action recruteur "Envoyer un message groupé" depuis une session ou projet | Liste de candidats sélectionnés | Sujet libre saisi par le recruteur | Corps libre, paragraphes auto-séparés, liens cliquables détectés via regex. |
| `weekly-project-recap` | Cron hebdo `send-weekly-recaps` | Destinataires du projet | « Récap hebdo : <poste> » `[À VÉRIFIER]` | Liste des candidats de la semaine (date, score, recommandation, lien rapport), totaux et moyennes, distribution des recommandations. |
| `interview-issue-report` | `report-interview-issue` (candidat signale un problème) | Équipe interne (`hello@interw.ai`) | « Problème signalé pendant un entretien » `[À VÉRIFIER]` | Nom et email candidat, poste, projet, message du candidat, lien vers la session côté admin. |
| `demo-request` | Soumission `DemoRequestDialog` sur la landing | Équipe (`hello@interw.ai`) | « Demande de démo » | Email du prospect, message libre. |
| `email-failure-alert` | `check-email-failures` quand le seuil de la config alerte est atteint dans la fenêtre | Destinataires d'alerte `[À VÉRIFIER]` | « Alerte : échecs d'envoi email » `[À VÉRIFIER]` | Nombre d'échecs, fenêtre, seuil, détails ; respect du cooldown configuré. |

### 10.3 Politique commune

- Vérification de suppression (`suppressed_emails`) avant tout envoi.
- Un jeton de désabonnement unique par email est généré/réutilisé (`email_unsubscribe_tokens`) et lié au pied de page.
- Log dans `email_send_log` : `pending` → `sent` / `failed`, message id, metadata (peut contenir `session_id`).
- `reply_to` paramétrable au cas par cas (rapport → candidat ; sinon adresse organisation).

---

## 11. Intégrations externes

| Service | Rôle | Points d'intégration | Variables d'environnement |
|---|---|---|---|
| Lovable AI Gateway | Passerelle IA unifiée (Gemini Flash/Pro/3, multimodal, tool calling, JSON mode) | `ai-conversation-turn`, `generate-report`, `transcribe-session`, `analyze-paraverbal`, `analyze-nonverbal`, `copilot-chat`, `import-job-offer`, `import-public-page-from-url` | `LOVABLE_API_KEY` |
| Firecrawl | Scrape de pages web (markdown) | `import-job-offer`, `import-public-page-from-url` | `FIRECRAWL_API_KEY` |
| ElevenLabs | TTS premium et clonage de voix | `tts-elevenlabs`, `clone-voice`, `delete-cloned-voice` | `ELEVENLABS_API_KEY` `[À VÉRIFIER]` |
| OpenAI | TTS alternatif | `tts-openai` | `OPENAI_API_KEY` `[À VÉRIFIER]` |
| Gemini (API directe) | TTS alternatif | `tts-gemini-direct` | `GEMINI_API_KEY` `[À VÉRIFIER]` |
| Fournisseur email (Mailgun via API interne) | Envoi des emails | `process-email-queue` | Géré via Vault interne (`email_queue_service_role_key`, etc.). Domaine `notify.interw.ai`. |
| (Remotion) | Composition vidéo marketing / démo en local dans le dossier `remotion/` | Hors application web | — (build local) |
| ffmpeg.wasm | Export MP4 côté client | `useMp4Download`, workers d'export | Fichiers servis depuis `public/ffmpeg/` |

Aucun fournisseur de paiement n'est intégré dans le code (pas de Stripe, Paddle, etc.).

---

## 12. Design et ton

- **Identité de marque :** "Interw" / "interw.ai".
- **Couleur primaire :** indigo `#6366F1` (HSL `239 84% 67%`), utilisée pour CTA, accents, sidebar, focus ring.
- **Couleurs sémantiques :** `success` vert (HSL `152 60% 52%`), `warning` orange (HSL `38 92% 50%`), `destructive` rouge (HSL `0 84% 60%`), `info` bleu (HSL `205 90% 60%`), neutres carte/fond blancs.
- **Mode sombre** prévu (palette dédiée sur `.dark`).
- **Typographie :** Inter pondérations 300/400/500/600/700, depuis Google Fonts. Aucune fonte serif.
- **Rayons et ombres :** rayon de base `0.5rem`. Esthétique sobre, minimaliste, "Apple-like".
- **Code couleur des scores :**
  - Fit Poste : ≥ 70 vert, ≥ 45 orange, < 45 rouge.
  - Big Five : score 0-100 avec interprétation.
- **Langue :** interface 100 % française, tutoiement de l'utilisateur recruteur dans certains contextes IA, vouvoiement du candidat dans les emails et l'entretien.
- **Ton :** sobre, factuel, langage de manager — proscrire le jargon RH/psy. Les prompts IA imposent ce ton à toutes les sorties (verdict, drivers, fit, signals, summary).
- **Anti-discrimination :** mention explicite dans tous les prompts critiques (copilote, génération rapport, non-verbal, import offre).
- **Bannière disclaimer IA** affichée sur les rapports candidat (`AiAnalysisDisclaimer`).

---

## 13. Dette et trous connus

- **Statut "in_progress"** sur sessions : pas de garantie qu'une session restée en `in_progress` longtemps sans média ait été correctement nettoyée — le cron `cleanup-abandoned-sessions` couvre les cas standards mais s'appuie sur l'existence de fichiers pour décider entre récupération et purge.
- **Réparations IA partielles non garanties** : `generate-report` enregistre les anomalies non réparées (`stats.report_anomalies`) mais ne re-bloque pas le rapport. Un rapport peut donc afficher un score < 20 sur un critère avec une justification courte si la passe de réparation échoue après 2 essais.
- **`enable_bias_detection`** existe sur `organizations` mais aucun code applicatif lu ne l'utilise. `[INCOMPLET]`
- **Suppression de compte utilisateur** : absente côté utilisateur, uniquement réalisable par super admin. `[INCOMPLET]`
- **`copilot_messages.parts`** (jsonb) : présent en BDD mais usage non confirmé dans le rendu courant. `[À VÉRIFIER]`
- **`visible_to_user_ids`** sur `projects` : champ présent, mais les policies RLS lues n'imposent pas une restriction stricte basée dessus (l'appartenance à l'organisation suffit). `[À VÉRIFIER]` : le filtrage peut n'être réalisé que côté UI.
- **Templates email auth** : sujets et contenu exacts non lus pour chaque template (signup, magic-link, recovery, invite, email-change, reauthentication). `[À VÉRIFIER]`
- **Pricing organisation** : champ texte libre, aucune logique de quota fortement appliquée (`session_credits_total` non décrémentée automatiquement dans le code lu). `[INCOMPLET]`
- **`weekly-project-recap`, `check-email-failures`, `purge-old-videos`, `process-email-queue`, `process-report-queue`** : aucune migration `cron.schedule` n'apparaît dans le code pour ces jobs ; leur planification est gérée par un mécanisme interne distinct (outils d'infrastructure). La reconstruction doit reproduire ces crons explicitement.
- **Duplication des champs entre `projects` et `interview_templates`** : presque tous les paramètres de configuration d'entretien sont dupliqués entre les deux tables (TTS, intro, IA, candidate_fields, messages, etc.). La reconstruction gagnerait à factoriser ces réglages dans une structure réutilisable.
- **Duplication des champs entre `questions` et `interview_template_questions`** + entre `evaluation_criteria` et `interview_template_criteria`. Idem côté factorisation.
- **Routes héritées `/interview/...`** sont redirigées en dur sur `/session/...` ; à conserver pendant une période de transition pour ne pas casser les emails déjà envoyés.
- **Modèle `gemini-3-flash-preview`** utilisé par le copilote — modèle preview, sujet à dépréciation rapide.
- **Sessions démo** : marquées `is_demo`, mais les contrôles d'écriture des messages reposent uniquement sur le statut du projet — `[À VÉRIFIER]` : aucune limite stricte de durée ou de stockage spécifique au démo.
- **Crédits TTS** : pas de cache server-side ni de limite par organisation visible ; coût TTS supporté par défaut sur le compte fournisseur configuré.
- **Pas de gestion de plusieurs langues** au-delà du français pour les prompts IA : tout est codé en dur en français, y compris les enums de transitions ("Écoutons", "Regardons", etc.).
- **Pas de tests unitaires d'évaluation IA** : la qualité des sorties est testée uniquement via des heuristiques de validation post-réponse (planchers anti-aberration, retry ciblé) — pas de jeu d'évaluation reproductible.
- **`finalize-session`** est conservée pour rétro-compatibilité — toute la logique réelle est dans `process-report-queue`. Une reconstruction peut fusionner les deux.

---

*Fin du document.*
