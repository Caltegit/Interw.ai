# Plan — Combler le trou de surveillance micro pendant l'entretien

## Objectif
Couvrir la fenêtre "pendant la réponse candidat" où le système actuel est aveugle : détecter en temps réel un micro qui tombe (track muted, OS coupe l'accès, périphérique débranché, RMS plat) et offrir une récupération sans abandonner l'entretien.

---

## Architecture cible

```text
InterviewStart
  ├─ useMicHealthWatcher (nouveau hook)
  │     ├─ surveille track.muted / readyState / RMS pendant recording
  │     ├─ émet états : ok | low | silent | track-dead
  │     └─ déclenche reacquireMic() si track-dead
  ├─ MicFailureBanner (nouveau composant, overlay rouge)
  │     ├─ visible quand état = silent (>4s) ou track-dead
  │     └─ bouton "Réactiver le micro" → changeMicrophone()
  └─ MicVolumeMeter (existant) — affiché en permanence pendant recording
        (aujourd'hui uniquement au warm-up)
```

---

## Lot 1 — Hook `useMicHealthWatcher`

**Fichier** : `src/hooks/useMicHealthWatcher.ts` (nouveau)

**Rôle** :
- prend `stream`, `active` (bool true uniquement pendant recording réel)
- mesure RMS toutes les 250 ms via AnalyserNode (réutilise la logique de `micLevel.ts`)
- écoute `track.onmute` / `onunmute` / `onended`
- expose `{ status: "ok" | "low" | "silent" | "track-dead", lastSpokeAt, peak }`
  - `silent` = RMS < 0.01 pendant > 4 s **alors que** STT n'a rien renvoyé
  - `track-dead` = `track.muted === true` OU `track.readyState !== "live"`
- ne se déclenche **pas** pendant TTS (passer un flag `paused` depuis InterviewStart)

**Implications / bugs possibles** :
| Risque | Mitigation |
|---|---|
| Faux positif : candidat qui réfléchit en silence → "silent" injustifié | Seuil 4 s + croisé avec absence d'event STT ; si STT a reçu du texte récent, on reset le timer |
| Faux positif : TTS qui parle, le micro semble silencieux car AEC | Pause complète du watcher quand `aiSpeaking === true` |
| AudioContext supplémentaire qui sature iOS Safari (limite ~6 contextes) | Réutiliser un AnalyserNode déjà créé par `MicVolumeMeter` via un contexte partagé (`src/lib/sharedAudioContext.ts`) — sinon créer 1 seul ctx pour tout l'entretien |
| Boucle infinie de reacquire si l'OS refuse durablement | Compteur : 3 tentatives auto puis on bascule en UI bloquante |
| Conflit avec le watchdog STT existant (restart STT toutes les 10 s) | Le watchdog STT continue son job ; le nouveau hook ne touche pas à STT, il surveille la couche matérielle uniquement |

---

## Lot 2 — Récupération du `MediaStream`

**Fichier** : ajouter `reacquireMic()` dans `InterviewStart.tsx` (à côté de `changeMicrophone` ligne 1577)

**Rôle** :
- `stream.getAudioTracks().forEach(t => t.stop())`
- `navigator.mediaDevices.getUserMedia({ audio: { deviceId } })` avec le deviceId actuellement sélectionné
- remplace la piste audio dans le `MediaRecorder` en cours (via `replaceTrack` si possible, sinon stop + recreate recorder)
- réinjecte le nouveau stream dans `MicVolumeMeter` + le watcher

**Implications / bugs possibles** :
| Risque | Mitigation |
|---|---|
| **MediaRecorder ne supporte pas `replaceTrack`** | Plan B : `stop()` propre du recorder, upload du chunk courant, redémarrage avec nouveau stream — risque de perdre 1-2 s d'audio entre les deux. Documenter dans le rapport `audio_health` |
| Perte du contexte STT (SpeechRecognition) qui était lié à l'ancien stream | Forcer `recognition.stop()` + redémarrage après reacquire (déjà géré par le watchdog STT) |
| Le navigateur redemande la permission → modal système qui interrompt | Si `permissions.query({name:"microphone"})` = "granted", `getUserMedia` est silencieux ; sinon on **doit** afficher la bannière "cliquez pour réactiver" car le geste utilisateur est requis sur Safari/Firefox |
| Race condition : reacquire pendant qu'un chunk est en cours d'upload | Verrou `reacquireInFlight` + queue ; n'autoriser qu'un reacquire à la fois |
| Nouveau deviceId disparu (clé USB débranchée) | Fallback `deviceId: undefined` (= device par défaut) ; si échec aussi → `MicBlockingDialog` |

---

## Lot 3 — `MicFailureBanner`

**Fichier** : `src/components/interview/MicFailureBanner.tsx` (nouveau)

**Rôle** :
- bannière rouge sticky en haut de la zone de réponse (pas modal — l'entretien continue côté UX visuelle, mais on **bloque l'avancée à la question suivante**)
- 2 états :
  - **silent** (avertissement orange) : "Nous ne détectons plus votre voix. Parlez plus fort ou vérifiez votre micro."
  - **track-dead** (rouge bloquant) : "Votre micro a été déconnecté." + bouton "Réactiver le micro" + lien "Changer de micro"
- bouton "Réactiver" appelle `reacquireMic()`

**Implications / bugs possibles** :
| Risque | Mitigation |
|---|---|
| Le candidat ferme/ignore la bannière et continue à parler dans le vide | Bloquer le bouton "Question suivante" tant que status ≠ ok depuis 3 s |
| Bannière qui clignote si état oscille silent ↔ ok | Debounce : passage à ok exige 2 s de stabilité avant de masquer |
| Empilement visuel avec les nudges silence existants (silenceTier) | Supprimer/atténuer le nudge silenceTier quand `MicFailureBanner` est actif — le bug matériel prime sur le nudge comportemental |

---

## Lot 4 — `MicVolumeMeter` persistant pendant l'entretien

**Fichier** : `src/pages/InterviewStart.tsx` (intégration)

**Rôle** :
- aujourd'hui le vu-mètre n'est visible qu'au warm-up
- l'afficher en petit, discret, à côté du bouton d'enregistrement, pendant toute la phase recording
- donne au candidat un feedback visuel **continu** : "oui, je suis bien entendu"

**Implications / bugs possibles** :
| Risque | Mitigation |
|---|---|
| 2 AudioContext (vu-mètre + watcher) → limite iOS | Partager un contexte via `sharedAudioContext.ts` (1 ctx, 2 AnalyserNode branchés sur la même source) |
| Distraction visuelle / charge cognitive | Version mini (8 barres, hauteur 16px), gris/vert, sans label |
| Performance : 2 rAF en parallèle | Fusionner : 1 seule boucle rAF dans le hook partagé, qui pousse vers les 2 consumers |

---

## Lot 5 — Télémétrie & rapport

**Fichier** : `src/pages/InterviewStart.tsx` + colonne existante `audio_health`

**Rôle** :
- logger via `logger.warn` chaque transition d'état (silent, track-dead, reacquire ok/ko)
- enrichir `audio_health` final avec :
  - `mic_failures: [{ at, type, recovered: bool, duration_ms }]`
  - `reacquire_attempts: number`
- côté RH (`AudioHealthBanner`), afficher si une récupération a eu lieu

**Implications / bugs possibles** :
| Risque | Mitigation |
|---|---|
| Bruit de logs si micro instable | Aggréger : 1 entrée par épisode (transition ok→fail→ok = 1 ligne), pas 1 par tick |
| Schéma `audio_health` étendu → backward compat des rapports passés | Champs optionnels uniquement, lecture défensive côté `AudioHealthBanner` |
| Pas de migration SQL : c'est du JSONB ✅ | — |

---

## Ordre de livraison

1. `sharedAudioContext.ts` + refacto `MicVolumeMeter` pour l'utiliser (no-op fonctionnel, fondation)
2. `useMicHealthWatcher` (passif, logs uniquement, pas d'UI)
3. `MicFailureBanner` + branchement état `silent`
4. `reacquireMic()` + bouton "Réactiver" + état `track-dead`
5. Vu-mètre persistant pendant recording
6. Enrichissement `audio_health` + affichage RH

Chaque lot est testable indépendamment ; on peut s'arrêter après le 3 et déjà gagner ~70 % des cas remontés.

---

## Tests à ajouter (Playwright)

- `tests/e2e/interview-mic-failure.spec.ts` : mock `getUserMedia` qui retourne un stream avec `track.muted = true` après 5 s → vérifier que la bannière apparaît et bloque "Question suivante"
- Test unitaire `useMicHealthWatcher` : injection d'un mock AnalyserNode, vérifier transitions ok→silent→track-dead

---

## Hors scope (à traiter plus tard)
- Renvoi automatique d'un lien de reprise si le candidat quitte (Lot 5 du diagnostic initial)
- Refonte du formulaire de signalement candidat (point 2 du diagnostic initial)
- Workflow RH "résolu" sur les feedbacks
