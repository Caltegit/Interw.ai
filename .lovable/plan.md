

# Plan — Application d'entretien vidéo IA (Phase 1 MVP)

Ce projet est très ambitieux. Le plan se concentre sur la **Phase 1 MVP** : la structure de données, l'authentification RH, le back-office (CRUD projets, questions, criteres), le parcours candidat basique, et la generation de rapport IA. Les fonctionnalites temps reel (WebRTC, TTS, STT live) seront simplifiees dans un premier temps.

---

## Ce qui sera construit

### 1. Backend Supabase (Lovable Cloud)
- Activer Lovable Cloud
- Creer les tables : `organizations`, `user_roles`, `projects`, `questions`, `evaluation_criteria`, `sessions`, `session_messages`, `transcripts`, `reports`
- RLS sur toutes les tables (isolation par organisation)
- Bucket Storage prive pour les medias (videos presentation, avatars, enregistrements)

### 2. Design System
- Mettre a jour `index.css` : couleur primaire `#6366F1` (indigo), succes, warning, danger
- Police Inter via Google Fonts
- Border radius ajuste (8px composants, 12px cards)

### 3. Authentification
- Page `/login` avec Supabase Auth (email/password)
- Guard de route pour les pages RH
- Gestion du profil utilisateur lie a une organisation

### 4. Layout RH
- Sidebar de navigation (Dashboard, Projets, Parametres)
- Layout responsive avec sidebar collapsible

### 5. Pages back-office
- **Dashboard** (`/dashboard`) : compteurs, tableau des dernieres sessions, bouton "Nouveau projet"
- **Liste projets** (`/projects`) : cards avec titre, poste, nb sessions, statut
- **Creation projet** (`/projects/new`) : formulaire multi-etapes (stepper 5 etapes)
  - Etape 1 : Infos generales
  - Etape 2 : Medias & avatar (upload video + photo)
  - Etape 3 : Questions (drag & drop, type, relances, criteres lies)
  - Etape 4 : Criteres d'evaluation (poids, echelle, ancres) + parametres rapport
  - Etape 5 : Parametres & publication
- **Detail projet** (`/projects/:id`) : header + onglets (Apercu, Sessions, Questions, Criteres)
- **Detail session** (`/sessions/:id`) : layout 2 colonnes (transcription + rapport)

### 6. Parcours candidat (simplifie pour MVP)
- **Page d'accueil** (`/interview/:token`) : verification token, video presentation, bouton deverrouille apres visionnage
- **Interface entretien** (`/interview/:token/start`) : version simplifiee avec photo statique IA, enregistrement audio via MediaRecorder, envoi audio pour transcription
- **Page de fin** (`/interview/:token/complete`) : confirmation

### 7. Composants UI cles
- `ProjectCard`, `SessionStatusBadge`, `RecommendationBadge`
- `QuestionBuilder`, `CriterionBuilder`, `WeightDistributor`
- `VideoPlayer`, `AudioPlayer`, `TranscriptViewer`
- `AvatarFrame`, `InterviewProgressBar`, `LiveTranscript`
- `ScoreCircle`, `CriterionScoreBar`, `QuestionEvalAccordion`
- `FlaggedMomentsTimeline`, `RecruiterNotes`

### 8. Edge Functions IA (via Lovable AI Gateway)
- `ai-conversation-turn` : gestion du tour de parole, prompt dynamique, decisions relance/question suivante
- `process-recording` : transcription post-entretien via IA
- `generate-report` : analyse complete avec scoring par critere, generation JSON structure

---

## Approche technique

- **Roles** : table `user_roles` separee (admin/recruiter/viewer) avec fonction `has_role()` SECURITY DEFINER
- **IA** : Lovable AI Gateway (modele par defaut) pour la conversation et l'analyse
- **Audio** : MediaRecorder API pour l'enregistrement, chunks uploades vers Supabase Storage
- **Transcription** : envoi audio a une edge function qui appelle Lovable AI pour transcrire
- **Stepper** : composant multi-etapes avec validation par etape (zod + react-hook-form)
- **Drag & drop** : bibliotheque legere pour reordonner questions et criteres

---

## Livrables de cette iteration

L'implementation se fera en plusieurs messages. Ce premier passage couvrira :
1. Configuration design system + Lovable Cloud
2. Schema de base de donnees complet avec RLS
3. Auth + layout RH + routing
4. Dashboard + CRUD projets (formulaire stepper)
5. Parcours candidat basique
6. Edge functions IA + generation rapport

Les fonctionnalites Phase 2/3 (video candidat, avatar anime, export PDF, notifications email, partage rapport, stats avancees) seront ajoutees ulterieurement.

