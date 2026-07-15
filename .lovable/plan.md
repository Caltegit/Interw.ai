# Fix — sessions "completed" sans aucun enregistrement

## Diagnostic (vérifié en base)

Les 2 sessions signalées :

| Candidat | Status | media_count | started_at |
|---|---|---|---|
| Malorie Zimmer | completed | **0** | null |
| Gabriel Roches | completed | **0** | null |

Elles apparaissent "complété" dans le dashboard mais l'écran de détail dit "Aucun enregistrement disponible" — cohérent avec 0 segment média.

## Cause racine

`src/pages/InterviewStart.tsx` ~ligne 3480, dans le handler de fin d'entretien :

```ts
await supabase.from("sessions").update({
  status: "completed",
  completed_at: ...,
  duration_seconds: ...,
}).eq("id", sessionId);
```

Aucun contrôle n'est fait sur la présence de média. Si le candidat traverse le flux sans qu'aucun segment vidéo/audio n'ait été uploadé (perm caméra refusée, micro HS, bug MediaRecorder, réseau qui coupe pile pendant l'upload final), on écrit quand même `completed`.

La fonction serveur `finalize-abandoned-session` gère déjà ce cas correctement (lignes 391-401) : elle bascule en `status = 'cancelled'` si aucun média n'a été récupéré. Le chemin client doit faire pareil.

## Correctif

### 1. Vérifier la présence de média avant de marquer completed

Dans le bloc de finalisation client (`InterviewStart.tsx`, juste avant le `update` en `completed`), après le flush des jobs d'upload en attente :

```ts
const { count: mediaCount } = await supabase
  .from("session_messages")
  .select("id", { count: "exact", head: true })
  .eq("session_id", sessionId)
  .eq("role", "candidate")
  .or("video_segment_url.not.is.null,audio_segment_url.not.is.null");

if (!mediaCount || mediaCount === 0) {
  await supabase.from("sessions").update({
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  }).eq("id", sessionId);
  logger.warn("interview_finalize_no_media", { sessionId });
  return; // on n'enqueue pas de rapport
}

// sinon → update completed comme aujourd'hui
```

Impact : les sessions vides basculent en `cancelled` au lieu de `completed`. Le trigger Postgres `sessions_enqueue_report` ne s'exécute pas (il est branché sur `NEW.status = 'completed'`), donc pas de job de rapport orphelin.

### 2. Nettoyer les 2 sessions déjà en base

Migration one-shot pour ne pas laisser les 2 cas visibles dans le dashboard :

```sql
UPDATE public.sessions
SET status = 'cancelled',
    cancelled_at = COALESCE(cancelled_at, completed_at, now()),
    completed_at = NULL
WHERE status = 'completed'
  AND id NOT IN (SELECT session_id FROM session_messages
                 WHERE role='candidate'
                   AND (video_segment_url IS NOT NULL OR audio_segment_url IS NOT NULL));
```

À exécuter **une fois** après déploiement du fix client. Je liste les IDs impactés avant l'UPDATE pour validation (on ne touche que les sessions strictement à 0 média).

### 3. Vérification

- `SessionStatusBadge` gère déjà `cancelled` ? À vérifier — actuellement il retourne le label brut si non mappé. Ajouter `cancelled: { label: "Annulé", className: "bg-muted text-muted-foreground" }` dans `src/components/SessionStatusBadge.tsx`.
- E2E : ajouter (ou étendre) un test qui simule un candidat qui atteint la fin sans média → attend `status = 'cancelled'`.

## Hors périmètre (à discuter plus tard)

- **Pourquoi ces sessions ont 0 média** : perm caméra ? bug enregistreur ? réseau ? Le fix ci-dessus est défensif, il ne diagnostique pas la cause première. On peut instrumenter davantage (logger l'échec d'upload dès qu'il se produit, pas seulement à la fin).
- **UI candidat** : afficher un message clair côté candidat si à la fin on détecte 0 média (au lieu de le rediriger vers "merci"). C'est un autre chantier.

## Fichiers touchés

- `src/pages/InterviewStart.tsx` (bloc finalize ~3480)
- `src/components/SessionStatusBadge.tsx` (ajout label `cancelled`)
- `supabase/migrations/` (nouveau fichier avec l'UPDATE one-shot)
- `tests/e2e/` (test optionnel)
