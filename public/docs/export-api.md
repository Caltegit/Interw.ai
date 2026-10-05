# API d'export Interw

API en lecture seule qui donne accès aux données de production d'Interw : postes, questions, critères, entretiens, transcriptions, rapports et vidéos.

Conçue pour être appelée par du code (actions Convex, scripts) ou par un agent IA (Claude Code).

- **Adresse de base** : `https://qxszgsxdktnwqabsdfvw.supabase.co/functions/v1/export-api`
- **Méthode** : `GET` uniquement
- **Format** : JSON (UTF-8)
- **Accès** : lecture seule, toutes organisations confondues

---

## Authentification

Chaque requête doit porter l'entête `x-api-key` avec la clé secrète.

```http
GET /functions/v1/export-api?action=stats
x-api-key: <VOTRE_CLE>
```

- Clé absente ou fausse : `401 {"error":"Unauthorized"}`
- Ne jamais placer la clé dans du code exécuté dans un navigateur. La stocker dans une variable d'environnement (`INTERW_API_KEY`).

---

## Aperçu des actions

| Action | Rôle | Paramètres |
|---|---|---|
| `stats` | Chiffres globaux | aucun |
| `postes` | Postes avec questions et critères | `organization_id`, `project_id`, `limit`, `offset` |
| `sessions` | Liste des entretiens avec note de synthèse | `organization_id`, `project_id`, `status`, `since`, `limit`, `offset` |
| `session` | Entretien complet : transcription, rapport, liens vidéo, CV | `id` (obligatoire) |
| `orgs` | Organisations et leurs réglages | `organization_id`, `limit`, `offset` |
| `members` | Membres et invitations en attente | `organization_id`, `limit`, `offset` |
| `users` | Nom et e-mail d'utilisateurs | `ids` (obligatoire, 100 maximum) |

L'action se choisit par le paramètre `action`. Sans ce paramètre, `stats` est renvoyé.

### Paramètres communs

| Nom | Type | Défaut | Description |
|---|---|---|---|
| `limit` | entier 1–500 | 100 | Nombre d'éléments renvoyés |
| `offset` | entier ≥ 0 | 0 | Décalage pour la pagination |
| `organization_id` | UUID | — | Filtre sur une organisation |
| `project_id` | UUID | — | Filtre sur un poste |

Un UUID mal formé renvoie `400`.

---

## `action=stats`

Chiffres globaux de la plateforme. Les entretiens de démonstration sont exclus.

```bash
curl -s "$INTERW_API_URL?action=stats" -H "x-api-key: $INTERW_API_KEY"
```

```json
{
  "orgs": 42,
  "projects": 310,
  "questions": 2104,
  "criteria": 1290,
  "sessions": 5120,
  "completed": 3870,
  "reports": 3790,
  "videos": 9334
}
```

| Champ | Description |
|---|---|
| `orgs` | Organisations |
| `projects` | Postes (tous statuts) |
| `questions` | Questions actives (non archivées) |
| `criteria` | Critères d'évaluation |
| `sessions` | Entretiens hors démonstration |
| `completed` | Entretiens terminés |
| `reports` | Rapports générés |
| `videos` | Réponses vidéo enregistrées |

---

## `action=postes`

Postes triés du plus récent au plus ancien, avec leurs questions et critères imbriqués.

```bash
curl -s "$INTERW_API_URL?action=postes&limit=20" -H "x-api-key: $INTERW_API_KEY"
```

```json
{
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "title": "Commercial terrain",
      "job_title": "Commercial",
      "status": "active",
      "language": "fr",
      "max_duration_minutes": 20,
      "candidate_fields": { "linkedin": { "enabled": true, "required": false } },
      "created_at": "2026-09-01T10:00:00Z",
      "questions": [
        {
          "id": "uuid",
          "order_index": 0,
          "title": "Présentation",
          "content": "Présentez-vous en quelques mots.",
          "type": "open",
          "follow_up_enabled": true,
          "max_follow_ups": 1,
          "max_response_seconds": 120,
          "criteria_weights": { "<criterion_id>": 2 },
          "is_interw_profile": false,
          "archived_at": null
        }
      ],
      "evaluation_criteria": [
        {
          "id": "uuid",
          "order_index": 0,
          "label": "Communication",
          "description": "Clarté et structure du discours",
          "weight": 3,
          "scoring_scale": "0-10",
          "applies_to": "all_questions",
          "anchors": null
        }
      ]
    }
  ],
  "limit": 20,
  "offset": 0
}
```

Remarques :
- Toutes les colonnes du poste sont renvoyées (réglages de voix, introduction, messages, etc.).
- Les questions **ne sont pas triées** : trier côté client par `order_index`.
- Une question avec `archived_at` non nul a été retirée du poste mais reste liée aux anciens entretiens.
- `presentation_video_url` (poste), `questions[].video_url` et `questions[].audio_url` : ressources publiques, téléchargeables directement.
- Critères : `weight` (poids relatif, entier), `scoring_scale` (`0-5`, `0-10` ou `ABC`), `applies_to` (`all_questions` ou `specific_questions`, voir `questions[].criteria_weights`), `anchors` (repères de notation facultatifs, JSON ou `null`).

---

## `action=sessions`

Entretiens triés du plus récent au plus ancien, avec la synthèse du rapport.

| Paramètre | Description |
|---|---|
| `status` | `pending`, `video_viewed`, `in_progress`, `completed`, `expired`, `cancelled` |
| `since` | Date ISO 8601 : entretiens créés à partir de cette date |

```bash
curl -s "$INTERW_API_URL?action=sessions&status=completed&since=2026-09-01&limit=50" \
  -H "x-api-key: $INTERW_API_KEY"
```

```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "organization_id": "uuid",
      "candidate_name": "Diane de La Rivière",
      "candidate_email": "diane@exemple.fr",
      "candidate_phone": null,
      "candidate_linkedin_url": "https://linkedin.com/in/...",
      "candidate_job_title": null,
      "status": "completed",
      "is_demo": false,
      "started_at": "2026-09-30T08:00:00Z",
      "completed_at": "2026-09-30T08:18:00Z",
      "duration_seconds": 1080,
      "recruiter_decision": "shortlisted",
      "created_at": "2026-09-29T17:00:00Z",
      "reports": { "overall_score": 74, "recommendation": "yes", "executive_summary_short": "..." }
    }
  ],
  "limit": 50,
  "offset": 0
}
```

- `reports` est un **objet ou `null`** (aucun rapport).
- `is_demo: true` signale un entretien de démonstration : à exclure des statistiques.
- `recruiter_decision` : `none`, `in_progress`, `accepted`, `shortlisted`, `rejected`, `second_opinion`.
- `recommendation` : `strong_yes`, `yes`, `maybe`, `no`.

---

## `action=session&id=<uuid>`

Entretien complet : fiche, échanges ordonnés, rapport, transcription et liens vidéo signés.

```bash
curl -s "$INTERW_API_URL?action=session&id=950c016e-f51e-40fc-9b42-7b472b822376" \
  -H "x-api-key: $INTERW_API_KEY"
```

```json
{
  "session": { "id": "uuid", "candidate_name": "...", "status": "completed", "...": "..." },
  "messages": [
    {
      "id": "uuid",
      "role": "ai",
      "content": "Présentez-vous en quelques mots.",
      "timestamp": "2026-09-30T08:00:05Z",
      "question_id": "uuid",
      "is_follow_up": false,
      "video_segment_url": null,
      "audio_segment_url": null,
      "video_duration_seconds": null,
      "video_url": null,
      "audio_url": null
    },
    {
      "id": "uuid",
      "role": "candidate",
      "content": "Bonjour, je m'appelle Diane...",
      "timestamp": "2026-09-30T08:00:20Z",
      "question_id": "uuid",
      "is_follow_up": false,
      "video_segment_url": "https://.../object/public/media/interviews/<session>/<fichier>.webm",
      "audio_segment_url": null,
      "video_duration_seconds": 94,
      "video_url": "https://.../object/sign/media/...?token=...",
      "audio_url": null
    }
  ],
  "report": { "overall_score": 74, "criteria_scores": {}, "interw_profiles": {}, "...": "..." },
  "transcript": { "full_text": "...", "word_count": 1820, "duration_seconds": 1080, "language": "fr" }
}
```

Points importants :
- `messages` est trié par `timestamp` croissant : questions de l'IA (`role: "ai"`) puis réponses (`role: "candidate"`).
- `question_id` relie chaque échange à une question du poste (`action=postes`).
- `video_url` / `audio_url` : liens temporaires **valables 6 heures**. Télécharger le fichier rapidement ; ne pas stocker le lien.
- `video_segment_url` / `audio_segment_url` : adresses complètes **non téléchargeables** (stockage privé). Elles ne servent que d'identifiants stables ; télécharger via `video_url` / `audio_url`.
- `session.candidate_cv_url` / `session.candidate_cover_letter_url` : liens signés **valables 6 heures**, accompagnés de `*_filename` et `*_mime_type` ; `null` si aucun fichier.
- `session.source` et `session.invited_by` : toujours `null`, l'origine de l'entretien (invitation ou lien public) n'étant pas enregistrée.
- Les vidéos sont le plus souvent au format **WebM** et ne contiennent pas toujours leur durée : utiliser `video_duration_seconds` quand il est présent.
- `report` et `transcript` valent `null` si non générés.
- Le jeton d'accès du candidat n'est jamais renvoyé.
- Session inconnue : `404`.

---

## `action=orgs`

Organisations, de la plus récente à la plus ancienne. Toutes les colonnes sont renvoyées.

```bash
curl -s "$INTERW_API_URL?action=orgs&limit=50" -H "x-api-key: $INTERW_API_KEY"
```

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Castalie",
      "slug": "castalie",
      "logo_url": "https://...",
      "created_at": "2026-03-01T09:00:00Z",
      "owner_id": "uuid",
      "session_credits_unlimited": false,
      "session_credits_total": 500,
      "enable_bias_detection": true,
      "pricing": null,
      "client_notes": null
    }
  ],
  "limit": 50,
  "offset": 0
}
```

---

## `action=members`

Une ligne par appartenance (`status: "active"`), puis les invitations en attente (`status: "invited"`, ajoutées sur la première page seulement, `offset=0`).

```bash
curl -s "$INTERW_API_URL?action=members&organization_id=<uuid>" -H "x-api-key: $INTERW_API_KEY"
```

```json
{
  "data": [
    {
      "status": "active",
      "organization_id": "uuid",
      "user_id": "uuid",
      "email": "eva@exemple.fr",
      "full_name": "Eva Martin",
      "role": "owner",
      "language": null,
      "created_at": "2026-03-01T09:00:00Z",
      "last_sign_in_at": "2026-10-04T16:12:00Z"
    },
    {
      "status": "invited",
      "organization_id": "uuid",
      "email": "marie@exemple.fr",
      "role": "member",
      "invited_at": "2026-10-02T10:00:00Z",
      "invited_by": "uuid"
    }
  ],
  "limit": 100,
  "offset": 0
}
```

- `role` : `owner` (propriétaire de l'organisation), `admin`, `member` ou `super_admin`.
- `language` : toujours `null` (non enregistrée).
- E-mails des recruteurs : données personnelles, même protection que les données candidats.

---

## `action=users&ids=<uuid,uuid,…>`

Résout les identifiants d'utilisateurs présents ailleurs (`created_by`, `report_recipient_user_ids`, `visible_to_user_ids`, `recruiter_decision_by`, `assigned_to`, `reviewed_by`, `invited_by`). 100 identifiants maximum ; les inconnus sont ignorés.

```bash
curl -s "$INTERW_API_URL?action=users&ids=uuid1,uuid2" -H "x-api-key: $INTERW_API_KEY"
```

```json
{
  "data": [
    { "id": "uuid1", "email": "eva@exemple.fr", "full_name": "Eva Martin" }
  ]
}
```

---

## Pagination

Boucler en augmentant `offset` de `limit` jusqu'à recevoir moins de `limit` éléments.

```ts
async function fetchAll(action: string, params: Record<string, string> = {}) {
  const out: unknown[] = [];
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const qs = new URLSearchParams({ action, limit: String(limit), offset: String(offset), ...params });
    const res = await fetch(`${process.env.INTERW_API_URL}?${qs}`, {
      headers: { "x-api-key": process.env.INTERW_API_KEY! },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { data } = await res.json();
    out.push(...data);
    if (data.length < limit) return out;
  }
}
```

---

## Erreurs

| Code | Signification | Que faire |
|---|---|---|
| `400` | Paramètre invalide ou action inconnue | Corriger la requête |
| `401` | Clé absente ou fausse | Vérifier `x-api-key` |
| `404` | Session introuvable | Vérifier l'`id` |
| `500` | Erreur interne | Réessayer plus tard avec un délai croissant |

Toutes les erreurs ont la forme `{"error": "message"}`.

---

## Exemple : import dans Convex

```ts
// convex/interw.ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const BASE = process.env.INTERW_API_URL!;
const KEY = process.env.INTERW_API_KEY!;

async function call(params: Record<string, string>) {
  const res = await fetch(`${BASE}?${new URLSearchParams(params)}`, { headers: { "x-api-key": KEY } });
  if (!res.ok) throw new Error(`Interw ${res.status}: ${await res.text()}`);
  return res.json();
}

export const importSession = internalAction({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const { session, messages, report } = await call({ action: "session", id: sessionId });
    for (const m of messages) {
      if (!m.video_url) continue;
      const blob = await (await fetch(m.video_url)).blob();
      const storageId = await ctx.storage.store(blob);
      // enregistrer storageId avec m.id, m.question_id, m.video_duration_seconds
    }
    // enregistrer session, messages et report dans vos tables
  },
});
```

Variables d'environnement Convex : `npx convex env set INTERW_API_URL ...` et `npx convex env set INTERW_API_KEY ...`.

---

## Recettes utiles

- **Statistiques du jour** : `action=sessions&since=<date du jour>&limit=500`, puis compter par `status`.
- **Jeu de test** : `action=sessions&project_id=<poste>&status=completed`, puis `action=session&id=...` pour chaque entretien retenu.
- **Questions d'un poste dans l'ordre** : `action=postes&project_id=<poste>`, trier `questions` par `order_index`, ignorer celles avec `archived_at`.

---

## Bonnes pratiques

- Données personnelles de candidats (RGPD) : limiter les copies au strict nécessaire, ne pas les exposer publiquement.
- Faire des appels séquentiels ou par petits lots ; éviter des centaines d'appels simultanés.
- Liens vidéo valables 6 heures : redemander `action=session` si un lien a expiré.
