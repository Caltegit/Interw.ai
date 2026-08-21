# Bascule vers app.interw.com — réponses avant exécution

## 1. Protocole de test inversé — validé

Ton protocole est le bon : `app.interw.com` en secondaire, `interw.ai` reste primaire, puis on ouvre un lien profond sur le secondaire et on regarde où on atterrit. La production n'est jamais touchée. J'attends ton observation avant d'écrire quoi que ce soit.

Une seule précision à garder en tête : la redirection est bien symétrique en mécanisme, mais teste avec une vraie URL de session existante (`/session/{slug}/start/{token}` ou `/entretien/...` selon la route réellement utilisée dans tes liens candidats) plutôt qu'un chemin inventé — un chemin inconnu peut être servi par le fallback SPA et masquer le résultat.

## 2a. Supabase Auth — liste exacte à ajouter avant la bascule

À faire dans Cloud → Auth, **avant** de passer le primaire :

**Site URL** — une seule valeur possible. Tant que `interw.ai` est primaire, elle reste `https://interw.ai`. Elle devient `https://app.interw.com` **au moment** de la bascule.

**Redirect URLs (allowlist)** — ajouter dès maintenant, sans rien retirer :

```text
https://app.interw.com
https://app.interw.com/**
```

En conservant les entrées existantes :

```text
https://interw.ai
https://interw.ai/**
```

Garder les deux jeux pendant toute la transition : les liens de confirmation d'email et de réinitialisation déjà envoyés pointent encore sur `.ai`.

Point d'attention : la Site URL sert de base aux liens générés par Supabase quand aucune `redirectTo` n'est fournie. Tant qu'elle vaut `.ai`, les emails d'auth continueront à pointer sur `.ai` même si l'app est servie sur `.com` — d'où l'ordre : ajouter les redirect URLs d'abord, basculer la Site URL en même temps que le domaine primaire.

## 2b. CORS — sortie du grep

**Il n'existe aucun fichier `supabase/functions/_shared/cors.ts`.** Contenu réel de `_shared/` :

```text
ai-models.ts   auth-guard.ts   email-templates/
resolve-start-seconds.ts   resolve-start-seconds_test.ts
session-storage-cleanup.ts   transactional-email-templates/
```

Grep sur les allowlists d'origines dans `supabase/functions/` : **aucune allowlist**. Toutes les fonctions déclarent en dur :

```text
"Access-Control-Allow-Origin": "*"
```

(30+ occurrences, toutes identiques : tts-openai, transcribe-session, superadmin-*, ai-conversation-turn, auth-email-hook, retry-email, etc.)

**Conclusion : rien à modifier côté CORS, l'app fonctionnera telle quelle sur `app.interw.com`.**

Seule exception déjà repérée : `finalize-abandoned-session/index.ts` renvoie l'origine reçue en écho, sans liste blanche — fonctionne aussi sur le nouveau domaine.

Les occurrences de `interw.ai` dans les Edge Functions ne sont pas du CORS, ce sont des URLs générées et des domaines d'envoi (Lot A / Lot B) :
- URLs générées (Lot A) : `send-weekly-recaps`, `generate-report:1523`, `process-report-queue:76`, `report-interview-issue`, `check-email-failures`, `resend-impacted-candidate`, `daily-health-report`, `send-abandon-reminders`, `send-invitation:66`, `get-email-template-defaults`, + 12 templates dans `_shared/transactional-email-templates/`
- Domaines d'envoi (Lot B, on n'y touche pas) : `SENDER_DOMAIN` / `FROM_DOMAIN` / `REPLY_TO_EMAIL` dans `send-transactional-email`, `auth-email-hook`, `request-password-reset-code`, `generate-report`, `retry-email`

Côté frontend, 11 fichiers contiennent `interw.ai` : `Landing.tsx`, `Legal.tsx`, `Privacy.tsx`, `OrgPublic.tsx`, `Settings.tsx`, `DemoRequestDialog.tsx`, `NewFeedbackDialog.tsx`, `AdminCandidatesToRecover.tsx`, `EditRecoveryTemplateDialog.tsx`, `ShareReportsDialog.tsx`, `BulkEmailDialog.tsx`.

## 2c. Templates stockés en base — 3 lignes, aucune côté clients

Colonnes vérifiées, aucune modification effectuée :

| Table | Colonnes vérifiées | Lignes contenant `interw.ai` |
|---|---|---|
| `email_template_overrides` | subject, html_body | **2** (org SUPER ADMIN : `invite`, `magiclink`) |
| `projects` | intro_text, completion_message, pre_session_message, candidate_email_subject, candidate_email_body | **1** (projet « Candidature spontanée », org UBIQ) |
| `interview_templates` | mêmes colonnes | 0 |
| `candidate_message_templates` | subject, body | 0 |
| `intro_templates` | intro_text, description | 0 |
| `question_templates` | content | 0 |
| `global_email_template_overrides` | subject, intro_html, outro_html | 0 |
| `project_public_pages` | content, seo_title, seo_description | 0 |

**Aucun client n'a enregistré `interw.ai` via « garder ce texte comme défaut ».** Les 2 overrides sont les tiens, la ligne UBIQ est un texte d'introduction affiché au candidat.

## 3. Reprise de session — quasi entièrement serveur

L'état de reprise vit en base :
- `sessions.last_question_index`, `status`, `started_at`, `last_activity_at`
- `session_messages` (échanges déjà enregistrés)
- le token est dans l'URL, donc il traverse le changement de domaine

Les médias ne sont pas bufferisés dans le navigateur : chaque `ondataavailable` déclenche un `uploadChunk` immédiat vers le stockage (`interviews/{sessionId}/q{n}/...`), avec un manifest écrit à la fin de chaque question. Un candidat qui reprend depuis une autre origine ne perd aucun enregistrement.

**Ce qui vit côté navigateur** (et ne suivra pas le changement d'origine) :

| Clé | Type | Impact à la reprise sur le nouveau domaine |
|---|---|---|
| `mic-test-validated:{token}` | sessionStorage | Le candidat devra refaire le test micro/caméra |
| `interview.preferredAudioDeviceId` / `...VideoDeviceId` | localStorage | Périphériques par défaut du navigateur au lieu du choix précédent |
| `audioDebug` | localStorage | Aucun (diagnostic interne) |

Aucun n'est bloquant : le pire cas est un test technique à refaire. Le flux de reprise (`resumePrompt` → `last_question_index`) est reconstruit depuis la base à chaque chargement.

Nuance : `sessionStorage` est de toute façon perdu à la fermeture de l'onglet, donc un candidat qui reprend le lendemain refait déjà le test micro aujourd'hui, même sans changement de domaine.

## Ce qui reste à décider

Rien n'est modifié tant que tu n'as pas validé. Séquence proposée :

1. Tu connectes `app.interw.com` en secondaire et tu me dis où atterrit le lien profond.
2. Si le chemin + query sont conservés : j'ajoute les redirect URLs dans Cloud → Auth, puis je lance le Lot A (URLs générées + textes de marque, hors domaines d'envoi).
3. Bascule du primaire + Site URL au même moment, une fois le Lot A déployé.
4. Lot B (domaines d'envoi) plus tard, sur ton signal.
