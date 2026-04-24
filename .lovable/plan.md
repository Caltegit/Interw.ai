

# Plan : Fiabiliser la lecture audio des questions sur mobile + adapter aux connexions lentes

## Diagnostic

Le flow actuel sur mobile a 3 fragilités :

1. **TTS du greeting démarré sans garantie que la voix est prête** : `beginInterview` lance `speak(greeting)` immédiatement après un warm-up minimal. Sur mobile, `speechSynthesis.getVoices()` peut être vide la première fois et les voix ElevenLabs (fetch réseau) peuvent prendre plusieurs secondes → l'utilisateur n'entend rien et la session démarre dans le silence.
2. **Aucune mesure du débit réseau** : les relances IA (`follow_up`) sont lancées même si la connexion est trop faible pour streamer le TTS rapidement → silence prolongé entre chaque relance.
3. **Pas d'indicateur de chargement entre les questions** : entre `prepareMediaUrl` et `speak(transition)`, le candidat voit seulement « IA réfléchit » sans % de progression, ce qui semble figé sur 3G.

## Solution proposée

### 1. Pré-warm-up TTS solide avant `setReadyToStart(true)`

Dans `beginInterview` (et nouveau bouton « Démarrer ») :

- **Étape A (geste utilisateur)** : créer une `SpeechSynthesisUtterance` silencieuse + un `Audio` muet HTML5 → débloque la policy autoplay iOS/Android.
- **Étape B (préchauffe ElevenLabs)** : si `tts_provider === "elevenlabs"`, faire un appel TTS « ping » avec un texte court (« Bonjour ») et **attendre** la réponse blob avant de continuer. On stocke le blob pour le rejouer comme greeting (zéro latence perçue).
- **Étape C (préchargement)** : `prepareMediaUrl` du média de la Q1 (déjà en place) + précharge la Q2 en arrière-plan.
- **Étape D (mesure réseau initiale)** : on chronomètre le temps de la requête TTS warm-up → mesure réelle du débit (`bytes / ms`). Persistée dans un ref.

Tant que A+B+C ne sont pas finis, l'écran de démarrage affiche **une barre de progression** (« Préparation de votre session… 40 % ») au lieu d'aller direct au flow.

### 2. Gate « question prête » avec barre de progression

Création d'un overlay `<QuestionLoadingOverlay percent={…} label="Chargement de la question 3/10…" />` affiché entre chaque question.

Étapes mesurées (poids fixes) :
- 30 % : upload du segment précédent (déjà awaité)
- 30 % : décision IA (`ai-conversation-turn`)
- 30 % : `prepareMediaUrl` ou pré-fetch TTS de transition
- 10 % : tampon fixe 300 ms pour stabiliser l'UI

L'overlay reste visible **jusqu'à ce que** :
- le blob audio TTS de la transition soit reçu (pré-fetch ElevenLabs avant `speak`)
- ET le média de la prochaine question soit `canplaythrough`

→ on gagne la garantie que rien ne joue avant d'être réellement prêt.

### 3. Détection de la qualité réseau et adaptation des relances

**Mesure** :
- Lecture de `navigator.connection.effectiveType` + `downlink` au start (Chrome/Android, ~80 % des candidats).
- Mesure runtime : on chronomètre chaque appel TTS ElevenLabs ; on calcule un **EWMA** (moyenne mobile pondérée) des kbps réels.
- Seuils :
  - `> 1.5 Mbps` → réseau OK, relances autorisées normalement
  - `0.5 – 1.5 Mbps` → réseau dégradé, **plafonner les relances à 1 max** (override `maxFollowUps`)
  - `< 0.5 Mbps` ou `effectiveType === "2g"/"slow-2g"` → **désactiver toutes les relances** (`relanceLevel = "light"` forcé côté client)

**Implémentation** :
- Nouveau hook `useNetworkQuality()` qui retourne `{ tier: "good"|"degraded"|"poor", measuredKbps }` + un ref muté à chaque mesure.
- Au moment d'appeler `ai-conversation-turn`, on injecte dans `projectContext` un override `forceMaxFollowUps` calculé selon le tier.
- L'edge function `ai-conversation-turn` est mise à jour pour respecter `forceMaxFollowUps` (priorité sur `maxFollowUps` de la question).
- Toast informatif au candidat la 1re fois qu'on dégrade : « Connexion lente détectée, session simplifiée ».

### 4. Fallback texte plus agressif

Si `prepareMediaUrl` échoue **OU** si le tier réseau est `poor`, on bascule directement la question en mode texte affiché (sans tenter le TTS qui prendrait 8 s).

## Changements techniques

| Fichier | Changement |
|---|---|
| `src/pages/InterviewStart.tsx` | Refonte de `beginInterview` (warm-up séquentiel + barre de progression). Nouveau state `prepProgress`. Wrapper `prepareNextQuestion()` qui pré-fetch le blob TTS via `tryElevenLabs` avant de `speak()`. Intégration `useNetworkQuality` |
| `src/components/interview/QuestionLoadingOverlay.tsx` | **Nouveau** : overlay plein écran avec barre `Progress`, label dynamique, animation discrète |
| `src/components/interview/InterviewBootProgress.tsx` | **Nouveau** : écran de boot avant `readyToStart` (4 étapes cochées + %) |
| `src/hooks/useNetworkQuality.ts` | **Nouveau** : combine `navigator.connection` + EWMA des mesures TTS, expose `tier` et `measuredKbps`, helper `recordTtsTiming(bytes, ms)` |
| `supabase/functions/ai-conversation-turn/index.ts` | Lecture de `projectContext.forceMaxFollowUps` (number ≥ 0) ; si défini, plafonne `maxFollowUps`. Si `forceMaxFollowUps === 0`, force `action = "next"` (jamais `follow_up`) |

## Aperçu UI du boot

```text
┌─────────────────────────────────────┐
│   Préparation de votre session      │
│                                     │
│   ████████████░░░░░░░  60 %         │
│                                     │
│   ✓ Voix de l'IA prête              │
│   ✓ Connexion testée (4G – 3.2 Mbps)│
│   ⟳ Chargement de la 1ʳᵉ question…  │
│   ○ Mise en mémoire tampon          │
└─────────────────────────────────────┘
```

## Notes

- Aucun changement de schéma DB nécessaire.
- Compatible avec le mode pause/resume existant.
- Le warm-up ElevenLabs ajoute ~1-2 s au démarrage mais supprime le silence de la 1re question = gros gain UX mobile.
- Le hook réseau dégrade silencieusement (jamais d'erreur bloquante).

