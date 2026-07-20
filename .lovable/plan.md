
# Rapport quotidien santé produit — email vers eva@alboteam.com

## Objectif
Recevoir chaque matin à ~7h (Europe/Paris) un email récapitulatif des dernières 24h. Premier envoi rétroactif couvrant les 3 derniers jours dès le déploiement.

## Contraintes validées
- Destinataire unique : **eva@alboteam.com** (hardcodé côté serveur)
- Réservé aux super admins : la fonction refuse d'envoyer ailleurs que vers cette adresse fixe (pas d'UI, pas de config user)
- Aucune nouvelle page, aucun composant frontend, aucune nouvelle table
- Cron 7h Paris (utilisation d'un cron `AT TIME ZONE 'Europe/Paris'` pour gérer été/hiver automatiquement)

## Contenu de l'email

Email HTML mono-colonne, sobre, avec en tête un badge de sévérité globale (vert / orange / rouge) calculé à partir des compteurs.

1. **Résumé chiffré (top)**
   - Nb sessions terminées / démarrées / abandonnées
   - Nb rapports générés OK / en erreur
   - Nb transcriptions OK / failed / too_large / low_confidence
   - Nb erreurs edge functions
   - Nb nouveaux feedbacks utilisateurs
   - Nb commits GitHub

2. **Edge functions & backend** (via `supabase.analytics_query` sur `function_edge_logs` + `postgres_logs`)
   - Compteurs par fonction : invocations / erreurs / latence P95
   - Top 5 messages d'erreur les plus fréquents avec `session_id` extrait si présent
   - Fonctions à surveiller en priorité : `generate-report`, `generate-fit-matrix`, `transcribe-session`, `process-report-queue`, `backfill-report-timestamps`, `store-repaired-video`, `finalize-abandoned-session`, `send-transactional-email`

3. **Sessions candidats anormales**
   - Sessions `failed` sur la fenêtre
   - Sessions terminées sans row dans `reports`
   - `report_jobs` avec `status = 'failed'` + `last_error`
   - Messages avec `transcription_status IN ('failed','too_large','low_confidence')`
   - Sessions bloquées en `processing` depuis > 30 min

4. **Feedback utilisateurs**
   - Nouveaux threads (`feedback_threads.created_at` dans la fenêtre)
   - Nouveaux messages non lus par un admin
   - Groupés par statut

5. **Historique code / risque de régression**
   - Commits GitHub des 24h via connecteur GitHub
   - Flag "zone sensible" si le commit touche une des zones critiques : `supabase/functions/generate-*`, `InterviewStart.tsx`, `videoRepair.worker.ts`, `useSessionDetail.ts`, `SessionReportView.tsx`, `finalize-abandoned-session`, migrations SQL
   - Si le connecteur GitHub n'est pas encore lié : section marquée "GitHub non connecté" avec un simple lien

6. **Emails & purges**
   - `email_alert_log` récents (bounces / complaints)
   - `data_purge_log` récents

## Architecture

```text
pg_cron  (`0 7 * * *` AT TIME ZONE 'Europe/Paris')
     │
     ▼
edge function: daily-health-report
     │
     ├── analytics_query : function_edge_logs, postgres_logs
     ├── SQL : sessions, reports, report_jobs, session_messages,
     │         feedback_threads, feedback_messages,
     │         email_alert_log, data_purge_log
     ├── GitHub API (si connecteur lié) : /repos/{owner}/{repo}/commits?since=...
     └── send-transactional-email
             ↓
     eva@alboteam.com
```

## Détails techniques

**Nouvelle edge function `daily-health-report`**
- Paramètre : `?period_hours=24` (défaut). Le 1er appel utilisera `72`.
- Destinataire **hardcodé** : `eva@alboteam.com`. Toute autre valeur passée en paramètre est ignorée.
- `verify_jwt = false` (appelée par pg_cron avec anon key). Sécurité : rate-limit implicite (1 appel/jour) + destinataire fixe.
- Utilise `SUPABASE_SERVICE_ROLE_KEY` pour requêter les tables.
- Utilise `send-transactional-email` avec un nouveau template `daily-health-report` (React Email) — pas de nouvelle table, juste un template ajouté au registry.
- Si le connecteur GitHub est présent (secret `GITHUB_API_KEY` dispo), appel via connector gateway. Sinon, la section commits affiche "non connecté".

**Nouveau template email `daily-health-report`**
- Fichier : `supabase/functions/_shared/transactional-email-templates/daily-health-report.tsx`
- Enregistré dans le registry existant `TEMPLATES`
- Reçoit `templateData` = `{ periodStart, periodEnd, severity, sections: {...} }`

**Cron pg_cron**
- Créé via `supabase--insert` (pas migration), car contient l'anon key du projet
- Expression : `0 7 * * *` avec `SET timezone TO 'Europe/Paris'` dans la commande, OU cron à `0 5 * * *` UTC + tolérance été/hiver (~1h de décalage). Solution retenue : utilisation de `cron.schedule` avec un wrapper `SELECT` qui filtre sur `EXTRACT(hour FROM now() AT TIME ZONE 'Europe/Paris') = 7` pour rester précis toute l'année.

**Premier envoi manuel (rétroactif 3 jours)**
- Après déploiement, appel unique avec `period_hours=72` pour envoi immédiat.

## Impact build & régressions possibles

- **Aucune modification** des chemins critiques (rapport, entretien, matrice, sessions, transcription)
- **Aucune nouvelle table**, **aucun nouveau composant React**, **aucune nouvelle page**
- Ajouts uniquement :
  - 1 nouvelle edge function isolée (`daily-health-report`)
  - 1 nouveau template email dans le registry
  - 1 cron pg_cron
- **Risque de régression : nul** sur l'app existante
- **Risque opérationnel** : si `analytics_query` renvoie beaucoup de lignes, la fonction peut être lente. Mitigation : `LIMIT 1000` par fonction et fenêtre stricte
- **Coût** : ~0 € (envoi gratuit dans le tier Resend, compute négligeable)

## Livrables

1. `supabase/functions/daily-health-report/index.ts` — la fonction (auto-déployée)
2. `supabase/functions/_shared/transactional-email-templates/daily-health-report.tsx` — template React Email
3. Ajout dans `supabase/functions/_shared/transactional-email-templates/registry.ts`
4. Insertion SQL du cron via `supabase--insert`
5. 1er appel manuel `period_hours=72` → email immédiat couvrant les 3 derniers jours envoyé à eva@alboteam.com

## À ta charge avant que je puisse construire

- **Connecter GitHub** (facultatif pour un 1er envoi, mais requis pour la section commits) : menu **+** en bas à gauche du chat → GitHub → Connect project. Si pas fait, je livre quand même et la section commits sera vide au 1er run.
