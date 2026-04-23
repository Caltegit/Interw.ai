

## Diagnostic et correction du bug audio sur mobile

### Cause du problème

Tu as bien observé le motif :
- **L’intro est lue normalement** parce qu’elle passe par la TTS (ElevenLabs ou voix navigateur). Pour ElevenLabs, le code récupère **tout le blob audio** avant d’appeler `play()`, donc dès que ça démarre, ça joue.
- **Les questions enregistrées (audio/vidéo)** passent par un `<audio>` ou `<video>` avec `preload="metadata"` et un `src` pointant vers Lovable Storage. Sur mobile, surtout en 4G/3G ou Wi‑Fi faible, quand le code appelle `play()` 200 ms après le montage, le navigateur n’a chargé que les métadonnées — pas assez d’octets pour démarrer la lecture. Résultat sur iOS Safari et Android Chrome : la lecture stagne, l’événement `playing` n’est jamais émis, et au bout de 5 s le **watchdog `armStallTimer`** (dans `QuestionMediaPlayer.tsx`) appelle `onPlaybackEnd()` → l’app passe à l’écoute candidat **sans qu’aucun son n’ait été émis**.
- Quand le réseau est rapide, ça passe → c’est bien intermittent comme tu le décris.

Ce n’est donc pas un problème de permissions audio mobile (sinon l’intro non plus ne marcherait pas), c’est un problème de **buffering insuffisant avant lecture**.

### Ce qui va être corrigé

**1. Forcer un préchargement plus agressif des médias de question** — `src/components/interview/QuestionMediaPlayer.tsx`
- Passer `preload="auto"` au lieu de `preload="metadata"` sur les `<audio>` et `<video>` en variante « featured ».
- Avant d’appeler `play()`, attendre l’événement `canplay` (avec un délai de garde de 6 s). Ainsi, sur réseau lent on attend que le navigateur ait assez bufferisé au lieu de déclencher `play()` à vide.
- Allonger le watchdog de stall de 5 s à 12 s, et le **réarmer** sur `waiting` plutôt que de conclure « lecture terminée ». On ne déclenche `onPlaybackEnd` par stall qu’en dernier recours.
- Ajouter un écouteur `progress` qui réinitialise le watchdog tant que le buffer continue de se remplir.

**2. Précharger la prochaine question pendant la TTS de transition** — `src/pages/InterviewStart.tsx`
- Quand l’IA prononce la phrase de transition entre deux questions, lancer en parallèle un `fetch(question.audio_url)` (ou `video_url`) pour mettre le fichier en cache HTTP du navigateur. Au moment où la question s’affiche, le `<audio>` se montera sur un fichier déjà téléchargé → lecture instantanée, même sur mobile.
- Idem pour la **première question** : déclencher le préchargement dès la fin de l’intro TTS plutôt qu’au montage du player.

**3. Indicateur visuel « Chargement de la question… »** — `QuestionMediaPlayer.tsx`
- Afficher un petit spinner discret (« Chargement audio… ») tant que `canplay` n’est pas atteint, pour que le candidat comprenne ce qui se passe au lieu de croire que rien ne marche.
- Sur stall réel (timeout dépassé), afficher un bouton « Lire la question » qui force une nouvelle tentative de `play()` sur clic utilisateur (geste explicite = contournement des restrictions mobiles).

**4. Test de débit côté candidat** — réponse à ta question
- **Oui**, c’est une bonne idée — on l’ajoute à l’écran `InterviewDeviceTest.tsx` qui fait déjà la vérification micro/caméra.
- Mesure simple : télécharger un asset connu (par ex. l’avatar IA ou un fichier de test de ~200 KB) et chronométrer pour estimer le débit en kbps. On affiche :
  - **Vert** ≥ 1 Mbps : « Connexion bonne »
  - **Orange** 300 kbps – 1 Mbps : « Connexion limitée — l’entretien fonctionnera mais les médias peuvent être lents à charger »
  - **Rouge** < 300 kbps : « Connexion très faible — risque de problèmes »
- C’est informatif uniquement (pas bloquant), et ça donne au candidat un signal clair en cas de souci.

### Hors champ

- Pas de transcodage des fichiers audio/vidéo côté serveur (compression plus agressive). On peut l’ajouter plus tard si le problème persiste.
- Pas de re-hébergement des fichiers sur un CDN dédié — Lovable Storage suffit avec le préchargement.
- Pas de fallback automatique « audio désactivé » sur connexion lente — on préfère que le candidat décide.

### Vérification après implémentation

1. Tester sur mobile en throttling réseau « Slow 4G » dans les DevTools → la première question doit jouer son audio.
2. Tester l’enchaînement de 3 questions consécutives → aucune ne doit sauter.
3. Vérifier qu’en cas de vrai stall (réseau coupé), le bouton « Lire la question » apparaît et permet de relancer.
4. Vérifier que la jauge de débit affiche un état cohérent sur l’écran de test.

