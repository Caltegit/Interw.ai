## Objectif

Permettre aux RH de tester un projet « comme un candidat » sans polluer les données : aucun rapport, aucun message en base, aucune transcription, aucun upload vidéo/audio. Le micro/cam sont quand même activés pour une simulation réaliste.

## Parcours démo

1. RH clique sur **Démo** (à gauche de « Partager le lien » sur la page projet) → ouvre dans un nouvel onglet l'URL publique `/session/:slug/demo`.
2. Page démo : un seul écran d'accueil minimal "Mode démo — aucun enregistrement ne sera effectué" → bouton **Commencer**.
3. Demande directe d'accès micro/caméra (gérée comme dans `InterviewStart`, sans la page test dédiée ni le consentement RGPD).
4. Déroulé identique à un vrai entretien : intro IA, questions, relances, etc. — toutes les questions du projet.
5. À la fin : écran final avec le message :
   > « Aucun enregistrement n'a été effectué. Si vous souhaitez simuler en tant que candidat, utilisez le "lien candidat". »

## Flag base de données

Ajouter `is_demo BOOLEAN NOT NULL DEFAULT false` sur `sessions`. Index partiel sur `is_demo = true` pour la purge.

Les sessions démo sont créées en base (le moteur d'entretien repose lourdement sur `sessions` / `session_messages`) mais isolées par ce flag.

## Isolation des sessions démo

Côté lecture (RH / dashboards / stats / récap hebdo / emails post-entretien) : ajouter systématiquement `is_demo = false` dans les requêtes des écrans :
- `Dashboard`, `Projects`, `ProjectDetail` (liste sessions, stats, filtres)
- `SessionsList`, `Candidates`
- `send-weekly-recaps` edge function
- `generate-report` (early return si `is_demo`)
- `finalize-session` (early return si `is_demo`)
- `transcribe-session` (early return si `is_demo`)
- `send-report-emails` (skip si `is_demo`)

Côté écriture : le code candidat ne change pas ; on bloque simplement les fonctions ci-dessus côté serveur.

## Côté client (InterviewStart) en mode démo

Ajouter une prop `isDemo` (déduite de `session.is_demo` chargé au boot). Quand `isDemo === true` :
- Ne pas créer/uploader les chunks vidéo (`uploadChunk`, `MediaRecorder.start` reste actif mais on ignore `ondataavailable`).
- Ne pas insérer les `session_messages` ni `transcripts`.
- Ne pas appeler `transcribe-session`, `generate-report`, `finalize-session`, `send-report-emails`.
- En fin de parcours, rediriger vers `/session/:slug/demo/end` qui affiche le message final.

Les LLM/TTS pour la conduite de l'entretien continuent de tourner (sinon plus de démo) — l'IA pose les questions, écoute via STT temps réel, mais rien n'est persisté.

## Nouvelles routes (publiques)

- `/session/:slug/demo` → `InterviewDemoLanding` (écran « Mode démo »)
- `/session/:slug/demo/run/:demoSessionToken` → `InterviewStart` avec prop `isDemo`
- `/session/:slug/demo/end` → page de fin avec le message

## UI bouton « Démo »

Placement : juste à gauche de `Partager le lien` dans `ProjectDetail.tsx` (lignes 702-711). Variante `outline`, icône `PlayCircle`, label "Démo". `target="_blank"` vers `/session/${project.slug}/demo`.

## Purge

Edge function planifiée existante `cleanup-data` (ou création) : supprimer les sessions `is_demo = true` de plus de 24 h (et leurs `session_messages` / médias liés). Hors scope si pas critique au lancement — le flag suffit à les isoler partout.

## Hors scope (v1)

- Pas de stats spécifiques sur l'usage du mode démo
- Pas d'auth requise (le bouton mène à une route publique, n'importe qui avec le lien projet peut lancer une démo — cohérent avec votre choix « lien public dédié »)
- Pas de purge automatique immédiate (à ajouter en v2 si volume gênant)

## Détails techniques

- Migration : `ALTER TABLE sessions ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;` + index `CREATE INDEX idx_sessions_is_demo ON sessions(is_demo) WHERE is_demo = true;`
- Toutes les requêtes SQL/queries Supabase listant des sessions reçoivent un `.eq('is_demo', false)`. Recherche exhaustive prévue avant code (env. 15-20 endroits estimés).
- Sur `InterviewStart`, factoriser les 4-5 points d'écriture en helpers gardés par `if (isDemo) return`.

## Risques

- `InterviewStart` fait ~3800 lignes ; chaque garde doit être posée avec soin pour ne pas casser le mode normal. Test obligatoire des deux flux (démo + réel) avant publication.
- Si un dashboard oublie le filtre `is_demo = false`, les sessions démo pollueront les chiffres. Audit complet des requêtes `sessions` indispensable.
