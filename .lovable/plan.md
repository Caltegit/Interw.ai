# Plan : Fiabiliser le micro candidat

## Contexte chiffré (confirmé)

Sessions terminées hors démo :

| Période | Sessions | Réponses < 200 caractères | Zéro réponse |
|---|---|---|---|
| 30 derniers jours | 184 | 16 (8,7 %) | — |
| 90 derniers jours | 460 | 24 | 14 |

Une session terminée sur onze est quasi vide côté parole candidat (moyenne normale ~7 100 caractères). Ce ne sont pas des candidats laconiques : c'est une capture audio perdue.

## Causes identifiées (vérifiées dans le code)

### Déjà couvertes — rien à faire
- **Piste qui meurt sans erreur** : `useMicHealthWatcher.ts` écoute déjà `track.addEventListener("ended")` et `("mute")`, avec tolérance de 5 s sur les blips Bluetooth.
- **Suppression de bruit agressive** : `micLevel.ts` impose déjà `noiseSuppression: false`, `autoGainControl: true`, `channelCount: 1`, `sampleRate { ideal: 48000, min: 16000 }`.

### Trous confirmés à traiter

1. **Codec Safari — partiellement traité, deux fuites en dur.** `getSupportedAudioMimeType()` teste bien `MediaRecorder.isTypeSupported()` avec `audio/mp4` en premier sur Safari. Mais deux endroits contournent cette détection : `InterviewStart.tsx:1633` (`previous.audioMime || "audio/webm"` au redémarrage après bascule de micro) et `:1943` (`audioMime: "audio/webm;codecs=opus"` à l'initialisation). Sur Safari, ces chemins produisent un enregistreur qui échoue ou sort un fichier illisible. Suspect n°1 pour les sessions terminées sans parole.

2. **Aucune trace serveur** : `logger.ts` n'écrit que dans la console navigateur. Tous les événements micro déjà instrumentés disparaissent à la fermeture de l'onglet. On répare à l'aveugle.

3. **Types d'erreur média non distingués.** Un seul `OverconstrainedError` est géré, et uniquement dans `InterviewDeviceTest.tsx:249`. Nulle part on ne distingue `NotAllowedError` (refus), `NotReadableError` (micro verrouillé par Teams/Zoom/Discord sur Windows), `NotFoundError` (aucun micro). Le candidat voit « Caméra inaccessible » quel que soit le vrai problème.

4. **Demande combinée audio + vidéo.** `startVideoStream` fait un seul `getUserMedia({ video, audio })`. Si le micro seul est indisponible, tout échoue avec un message faux.

5. **Bluetooth / profil HFP dégradé — angle mort total.** Sur AirPods et casques similaires, activer le micro force la bascule A2DP → HFP, qui peut produire du 8 kHz inexploitable par la transcription. Le code lit `getSettings().deviceId` mais **ne vérifie jamais le `sampleRate` réellement obtenu**. Un candidat qui répond depuis son téléphone avec des écouteurs peut enregistrer un audio techniquement valide mais intranscriptible.

6. **iOS Safari en arrière-plan — traité à moitié.** Un `visibilitychange` reprend bien l'`AudioContext` (`InterviewStart.tsx:794-815`), mais rien ne vérifie que la **piste média** a survécu : iOS la tue définitivement, et elle n'est pas réacquise au retour.

7. **Le contexte micro ne survit pas au parcours** : calibration en `sessionStorage`, micro préféré en `localStorage`. Rien ne bloque le démarrage sans test micro validé.

8. **Aucune preuve serveur qu'une réponse a été captée** : `transcribe-session` ne vérifie ni taille, ni durée, ni énergie du fichier audio.

9. **Bascule de micro à chaud non vérifiée** : aucune mesure que la nouvelle piste produit du signal après la bascule.

---


## Lot 1 — Voir ce qui casse (télémétrie micro pilotable)

> **Modification par rapport au plan initial** : la télémétrie n'est plus toujours active. Elle est **désactivée par défaut**, activable manuellement depuis l'admin, avec **purge automatique à 30 jours**.

### 1a. Table `mic_events` (déjà créée et déployée)
- `session_id`, `event`, `data jsonb`, `user_agent`, `browser`, `browser_version`, `os`, `device_type`, `created_at`.
- RLS : insertion via Edge Function (service key), lecture réservée aux super admins.
- Index sur `session_id`, `created_at`, `event`.

### 1b. Sink réseau `micTelemetry.ts` (déjà créé et déployé)
- Buffer en mémoire, flush toutes les 5s et sur `visibilitychange`/`pagehide`.
- `fetch(keepalive: true)` fire-and-forget, aucun `await` dans le chemin critique.
- Hook sur `logger.ts` : tout événement `mic_*` / `interview_audio_*` / `interview_media_*` est forwardé automatiquement.

### 1c. Edge Function `log-mic-events` (déjà créée et déployée)
- Valide le token candidat via `get_session_id_by_token`.
- Parse le User-Agent (navigateur, version, OS, type d'appareil).
- Insère les événements en bulk.

### 1d. NOUVEAU — Table de configuration `mic_telemetry_config` (à créer)
Singleton (une seule ligne, id=1), pattern identique à `email_send_state` :
- `id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1)`
- `enabled boolean NOT NULL DEFAULT false`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- `updated_by uuid` (qui a basculé le switch)

Seed : `INSERT INTO mic_telemetry_config (id, enabled) VALUES (1, false) ON CONFLICT DO NOTHING;`

Grants : `SELECT` pour `authenticated` (l'admin lit), `ALL` pour `service_role` (l'Edge Function consulte). RLS : lecture pour super_admin uniquement.

### 1e. NOUVEAU — Gate côté serveur dans `log-mic-events`
Après validation du token, avant l'insertion :
```ts
const { data: cfg } = await supabase
  .from('mic_telemetry_config').select('enabled').eq('id', 1).single()
if (!cfg?.enabled) return json(200, { ok: true, disabled: true, inserted: 0 })
```
Quand désactivé : retourne 200 avec `disabled: true`, **n'insère rien**.

### 1f. NOUVEAU — Auto-stop côté client `micTelemetry.ts`
Dans `flush()`, on lit la réponse. Si `disabled: true` :
- Flag `telemetryDisabled = true`
- Stoppe le `setInterval` de flush
- Retire le hook logger (`setTelemetryHook(null)`)
- Les futurs appels `trackMicEvent` deviennent no-op

Résultat : un seul cycle de flush gaspillé, puis silence. Non bloquant, sans risque candidat.

### 1g. NOUVEAU — Toggle admin dans `MicQualityTab.tsx`
Switch ON/OFF en haut de la page avec :
- État actuel (Activé / Désactivé)
- Bascule qui écrit dans `mic_telemetry_config`
- Date de dernière modification et qui l'a modifiée
- Texte : « Active la collecte d'événements micro côté candidat. Désactivé par défaut. »

### 1h. NOUVEAU — Purge automatique 30 jours (pg_cron)
```sql
SELECT cron.schedule(
  'purge-mic-events-daily',
  '0 3 * * *',  -- 3h UTC tous les jours
  $$ DELETE FROM public.mic_events WHERE created_at < now() - interval '30 days' $$
);
```
SQL direct, index sur `created_at` déjà existant.

### 1i. Onglet « Qualité micro » dans `/admin/system` (déjà créé et déployé)
- Taux d'incident par jour, par navigateur, par OS.
- Liste des sessions concernées avec lien direct.

---

## Lot 2 — Demander le micro proprement

- Séparer la demande : micro d'abord, caméra ensuite. Une caméra manquante ne doit plus faire échouer le micro, et inversement.
- Repli en cascade sur le micro : périphérique préféré → périphérique par défaut → contraintes minimales (`audio: true`).
- Messages d'erreur typés et actionnables, en français : refus de permission, périphérique occupé par une autre application, périphérique débranché, aucun micro détecté — chacun avec la manœuvre de réparation et un bouton « Réessayer ».
- `MicBlockingDialog` enrichi avec les consignes spécifiques Chrome / Safari / Edge et iOS / Android.

## Lot 3 — Ne plus démarrer un entretien sans micro prouvé

- Persister la calibration côté serveur (rattachée à la session) au lieu du seul `sessionStorage`, avec repli local.
- Rendre le test micro bloquant : sans mesure valide (pic et durée active au-dessus des seuils existants), le bouton de démarrage propose « Refaire le test micro » plutôt que de laisser passer.
- Contrôle éclair juste avant la première question : 1,5 s de mesure, et si le signal est plat, affichage de l'écran de réparation avant que la moindre question ne soit posée.

## Lot 4 — Vérifier la bascule et la reprise

- Après tout changement de micro ou toute réacquisition de piste, mesure de confirmation de 1 s : le message « Micro changé » n'apparaît que si du signal est effectivement présent, sinon on reste sur l'écran de réparation.
- Réacquisition automatique unique en cas de piste morte, avec repli sur le périphérique par défaut, puis journalisation du résultat.

## Lot 5 — Filet de sécurité serveur

- `transcribe-session` mesure taille, durée et énergie moyenne de chaque fichier audio de réponse ; en dessous du seuil, la réponse est marquée `audio_silent` et n'est plus notée (score neutre, cohérent avec la règle `evidence: none` déjà en place dans la matrice).
- Une session dont plus de la moitié des réponses sont `audio_silent` est signalée comme anomalie dans le suivi de récupération candidat existant, au lieu d'apparaître comme une session terminée normale.

---

## Critère de succès mesurable

Aujourd'hui, 8,7 % des sessions terminées (30 derniers jours) ont moins de 200 caractères de transcription candidat.

- **Objectif** : après déploiement des Lots 2 à 4, le taux de sessions < 200 caractères sur 30 jours doit passer sous 2 %.
- **Contrôle** : 30 jours après mise en production, requête SQL de comparaison avant/après.
- Si l'objectif n'est pas atteint, la télémétrie du Lot 1 (activée manuellement) identifie précisément le navigateur / OS / périphérique restant à traiter.
- Sans ce critère, on risque soit de surcorriger (toucher à ce qui marche), soit de s'arrêter trop tôt.

## Ordre de déploiement

1. **Lot 1** (télémétrie pilotable) — déployé, puis on active manuellement la collecte pour 48h de chiffres réels par navigateur/OS.
2. **Lots 2 et 3** — couvrent l'essentiel du vécu candidat.
3. **Lots 4 et 5** — finitions et filet de sécurité.

## Ce qui ne change pas
- Aucune modification de la logique d'acquisition audio dans le Lot 1 (`useMicHealthWatcher`, `InterviewStart`).
- Aucun changement du parcours candidat quand la télémétrie est OFF (un seul flush vide, puis silence).
- Les autres fonctionnalités (dashboard, rapports, etc.) non touchées.

## Risques Lot 1
- **Candidat** : zéro impact. `flush()` est fire-and-forget avec `.catch(() => {})`. Lire la réponse pour le flag `disabled` est non bloquant.
- **Build** : pas de dépendance nouvelle. `Switch` est un composant shadcn déjà présent.
- **DB** : une nouvelle table standalone + un job pg_cron. Aucune modification de table existante.
- **Admin** : un simple toggle lecture/écriture, protégé par RLS super_admin.
