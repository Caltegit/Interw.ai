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
| `session` | Entretien complet : transcription, rapport, liens vidéo | `id` (obligatoire) |

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
      "reports": [
        { "overall_score": 74, "recommendation": "yes", "executive_summary_short": "..." }
      ]
    }
  ],
  "limit": 50,
  "offset": 0
}
```

- `reports` est un tableau (vide si aucun rapport, sinon un seul élément).
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
      "video_segment_url": "interviews/<session>/<fichier>.webm",
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
- `video_segment_url` : chemin permanent dans le stockage, utile comme identifiant stable.
- Les vidéos sont le plus souvent au format **WebM** et ne contiennent pas toujours leur durée : utiliser `video_duration_seconds` quand il est présent.
- `report` et `transcript` valent `null` si non générés.
- Le jeton d'accès du candidat n'est jamais renvoyé.
- Session inconnue : `404`.

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
