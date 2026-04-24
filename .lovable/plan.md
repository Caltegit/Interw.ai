# Stabiliser la gestion du silence côté candidat

## Recommandation

Oui : je te conseille de supprimer les relances vocales « Prenez votre temps, je vous écoute ».

Dans l’état actuel, elles sont fragiles parce qu’elles s’appuient sur le même moteur TTS et sur les mêmes états (`isSpeaking`, `isProcessing`, `liveTranscript`) que le reste de l’entretien. Résultat : elles peuvent se déclencher au mauvais moment, se superposer à une transition, ou réarmer le minuteur alors qu’on est encore dans un changement d’état.

Le comportement le plus stable est :
- pas de relance vocale pendant le silence,
- un indice visuel discret si besoin,
- puis mise en pause automatique,
- puis arrêt forcé après 2 minutes si le candidat ne reprend pas.

## Ce que je ferais

### 1. Supprimer les relances vocales de silence
Dans `src/pages/InterviewStart.tsx` :
- retirer les 3 timers `SILENCE_NUDGE_1_MS`, `SILENCE_NUDGE_2_MS`, `SILENCE_NUDGE_3_MS`,
- retirer `playNudge()` et les refs `nudge1PlayedRef`, `nudge2PlayedRef`, `nudge3PlayedRef`,
- simplifier `resetSilenceTimer()` pour ne garder que :
  - un palier visuel léger,
  - un timer unique de pause automatique,
  - le cycle d’avertissement d’arrêt forcé déjà existant.

### 2. Faire partir le minuteur de silence uniquement pendant la vraie phase d’écoute
Aujourd’hui, le minuteur est aussi réarmé par :
- `liveTranscript`,
- `isSpeaking`,
- `isProcessing`.

C’est probablement la source principale des déclenchements au mauvais moment.

Je remplacerais ça par une logique plus stricte :
- le minuteur démarre seulement quand la question est finie et que l’écoute candidat commence réellement,
- il est arrêté dès qu’on sort de cette phase : pause, lecture IA, lecture média, traitement IA, changement de question, envoi de réponse.

Concrètement :
- supprimer l’effet qui fait `resetSilenceTimer()` sur `isSpeaking || isProcessing`,
- éviter le reset global à chaque variation de `liveTranscript`,
- appeler explicitement `resetSilenceTimer()` seulement dans les points d’entrée sûrs :
  - après `startListening()` quand la question est vraiment ouverte,
  - après reprise d’une pause quand on revient en écoute,
  - après une relance IA seulement au moment exact où l’écoute repart.

### 3. Ajouter un garde-fou d’éligibilité
Introduire une condition centrale du type :
- silence surveillé seulement si `isListening === true`
- et `isPaused === false`
- et `isSpeaking === false`
- et `isProcessing === false`
- et entretien non terminé.

Ainsi, même si un callback retardé survit quelques millisecondes, il ne pourra pas déclencher une pause au mauvais moment.

### 4. Conserver la mise en pause automatique, mais sobrement
Je garderais le principe que tu as demandé :
- absence de parole,
- mise en pause automatique,
- message vocal de pause seulement au moment où la pause est décidée,
- après 2 minutes de pause : avertissement « Dans 5 secondes… »,
- puis arrêt forcé.

Autrement dit :
- une seule parole système importante au moment de la pause,
- une seule parole système avant l’arrêt forcé,
- aucune relance intermédiaire.

### 5. Stabiliser encore la détection de parole
Pour éviter les faux silences, je renforcerais aussi :
- remise à zéro du timer seulement sur vraie activité micro utile,
- si besoin, seuil minimal de transcript non vide ou activité vocale continue avant de considérer que le candidat a repris,
- ne pas dépendre d’un `onresult` trop bavard ou trop sensible.

Sans changer tout le moteur STT, on peut déjà fiabiliser en considérant que :
- le minuteur ne repart pas parce que l’IA parle,
- le minuteur ne repart pas parce qu’un traitement réseau est en cours,
- il repart seulement parce qu’on est revenu en écoute candidat.

## Autres idées pour stabiliser

### Option A — Mon conseil
Passer à un modèle simple :
- 1 indice visuel discret au bout de quelques secondes,
- pause automatique ensuite,
- aucun message de relance parlé.

C’est l’option la plus robuste et la plus propre en expérience candidat.

### Option B — Encore plus radicale
Supprimer aussi l’indice visuel et ne garder que :
- écoute,
- pause automatique,
- message de pause.

C’est le plus simple techniquement, mais un peu plus abrupt côté utilisateur.

### Option C — Stabilisation par état explicite
Si on veut quelque chose de vraiment solide, on peut formaliser un mini état de phase d’entretien, par exemple :
- `presentation`
- `listening`
- `processing`
- `paused`

Puis faire dépendre toute la logique de silence de cette phase unique au lieu d’un mélange de booléens. C’est plus robuste pour la suite, mais ça touche davantage `InterviewStart.tsx`.

## Mon conseil final

Pour toi, je ferais :
- suppression des relances vocales,
- pause automatique sur silence,
- logique de silence active uniquement pendant la vraie écoute,
- conservation du compte à rebours de 2 minutes déjà prévu.

C’est le meilleur compromis entre stabilité, simplicité et risque de régression.

## Détails techniques

Fichier principal : `src/pages/InterviewStart.tsx`

Points à modifier :
- constantes de silence,
- `resetSilenceTimer()` et nettoyage des timers,
- suppression des relances TTS de silence,
- suppression de l’effet `isSpeaking || isProcessing -> resetSilenceTimer()`,
- recentrage des appels `resetSilenceTimer()` sur les seules reprises d’écoute,
- ajout d’un garde-fou central avant toute pause automatique.

Option de durcissement supplémentaire :
```text
presentation -> listening -> processing -> listening
      |             |             |
      v             v             v
    paused <--------+-------------+
```

Si tu valides, j’applique la version simple et robuste : sans relances vocales, avec pause auto propre.