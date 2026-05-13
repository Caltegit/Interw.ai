
## Cause racine identifiée

`finalize-session` appelle `transcribe-session` **une seule fois**. Or `transcribe-session` plafonne à **8 segments par exécution** (`MAX_SEGMENTS_PER_RUN = 8`). Pour un entretien de 15 questions, ~7 segments restent en `pending` quand `generate-report` se lance → l'IA reçoit une transcription tronquée → score 0.

C'est exactement ce qui s'est passé pour Typhaine (16 réponses, 9 transcrites au moment de la génération).

## Correctif

### Modifier `supabase/functions/finalize-session/index.ts`

Remplacer l'appel unique à `transcribe-session` par une **boucle** qui :

1. Appelle `transcribe-session` ;
2. Lit la réponse JSON et regarde `remaining` ;
3. Re-appelle tant que `remaining > 0` ;
4. S'arrête après **N itérations max** (filet de sécurité, par ex. 8 → couvre jusqu'à 64 segments) ou après un **timeout total** (par ex. 4 min) pour ne jamais bloquer indéfiniment ;
5. Une fois la boucle finie, vérifie en base que tous les `session_messages` candidats avec média sont en statut terminal (`done`, `skipped`, `failed`, `too_large`) ;
6. **Seulement ensuite** appelle `generate-report`.

Si après la boucle il reste des segments non terminaux, on génère quand même le rapport (mieux qu'un rapport manquant) **mais on log un warning** pour audit.

### Pourquoi pas un trigger « post-transcription » ?

Plus complexe (nécessite de savoir « est-ce que c'était le dernier segment ? » à chaque appel transcribe-session, et d'éviter les doubles déclenchements concurrents). La boucle dans `finalize-session` reste simple, idempotente, et tient dans le runtime edge (background task via `EdgeRuntime.waitUntil`, déjà en place).

### Garde-fou supplémentaire

Dans `generate-report`, ajouter un **garde-fou défensif** : si la transcription totale (somme des `length(content)` candidats) est inférieure à un seuil (ex. 200 caractères) **alors que la session a duré plus de 2 minutes**, on log une erreur et on **ne crée pas de rapport** (au lieu d'en créer un à 0). Ça force `finalize-session` ou un retry manuel à régénérer plus tard avec des données complètes.

## Détails techniques

**Boucle dans `finalize-session`** :
```
const MAX_TRANSCRIBE_RUNS = 8;
for (let i = 0; i < MAX_TRANSCRIBE_RUNS; i++) {
  const res = await invoke("transcribe-session", { session_id });
  const json = JSON.parse(res);
  if (!json.remaining || json.remaining === 0) break;
}
```

**Vérification finale** avant `generate-report` :
```
const { data: pending } = await supabase
  .from("session_messages")
  .select("id")
  .eq("session_id", session_id)
  .eq("role", "candidate")
  .or("video_segment_url.not.is.null,audio_segment_url.not.is.null")
  .not("transcription_status", "in", "(done,skipped,failed,too_large)");
if (pending && pending.length > 0) {
  console.warn("finalize-session: generating report with pending transcriptions", session_id, pending.length);
}
```

**Garde-fou dans `generate-report`** : au tout début, si `total_chars < 200 && duration_seconds > 120` → return sans créer de rapport, log explicite.

## Test après déploiement

1. Régénérer manuellement le rapport de Typhaine (`dfc86b36-…`) → doit passer de 0 à un score réaliste.
2. Vérifier les logs `finalize-session` : présence des appels itératifs `transcribe-session` sur la prochaine longue session.
3. Pas de régression sur les sessions courtes (1 seul appel suffit, boucle se termine immédiatement).

## Hors périmètre (volontairement)

- Pas de page d'audit super-admin ici (à voir dans une étape séparée si besoin).
- Pas de batch de régénération des 15 rapports passés (à faire à la main pour les 5 critiques, ou demande dédiée).
