# Renforcer le test technique pour bloquer en amont

## Constat

Aujourd'hui `InterviewDeviceTest` vérifie **micro, caméra et débit**, puis laisse passer même en cas de débit faible. Or les candidats qui restent coincés à la Q1 ont presque toujours un de ces problèmes :

1. **Lecture audio bloquée** (autoplay refusé sur iOS Safari, mode silencieux activé) → la salutation IA ne se joue jamais.
2. **MediaRecorder indisponible** (navigateur trop ancien, in-app browser TikTok / Instagram / LinkedIn / Facebook) → impossible d'enregistrer la réponse.
3. **Débit trop faible** (< 300 kb/s) → on les laisse continuer aujourd'hui alors que la session échouera.
4. **Navigateur non supporté** (Firefox iOS, WebView Android ancien) → APIs manquantes.

L'idée : tout détecter dans le test technique et **bloquer** clairement quand ce n'est pas récupérable, ou **avertir explicitement** quand c'est dégradé.

## Ce que je vais ajouter à `InterviewDeviceTest`

### 1. Test de lecture audio (nouveau, le plus important)

Ajouter une carte « Son » qui demande au candidat d'appuyer sur **« Tester le son »**. Au clic :

- Lecture d'un court bip (≈ 1 s, fichier déjà inclus comme data-URI silencieuse pour iOS, mais on utilisera un vrai bip audible).
- Si la lecture aboutit → coche verte « Son OK ».
- Si `play()` est rejeté ou si rien ne sort (détecté via `ontimeupdate` qui ne progresse pas en 2 s) → message bloquant : *« Votre navigateur a bloqué le son. Vérifiez que le mode silencieux est désactivé et autorisez le son pour ce site. »* + bouton **Réessayer**.
- Sur iOS, on en profite pour « débloquer » l'instance audio dans le geste utilisateur (utile pour la suite).

Ce test ne peut pas être contourné : sans son, pas de session.

### 2. Détection du navigateur

Au montage de la page, on détecte les cas non supportés et on affiche un **écran bloquant** avant même les tests :

- In-app browsers : TikTok, Instagram, Facebook, LinkedIn, Snapchat (regex sur `userAgent`).
- Firefox iOS (n'expose pas `MediaRecorder`).
- Absence de `MediaRecorder`, `getUserMedia`, ou `AudioContext`.

Message clair : *« Votre navigateur ne permet pas de réaliser l'entretien. Ouvrez ce lien dans Safari (iPhone) ou Chrome (Android / ordinateur). »* + bouton **Copier le lien**.

### 3. Vérification `MediaRecorder` réelle

Aujourd'hui on teste juste `getUserMedia`. On va aussi instancier un `MediaRecorder` sur le flux audio + récupérer 1 chunk via `start(250)` puis `stop()`. Si aucun chunk n'arrive en 2 s → erreur explicite.

### 4. Débit minimum bloquant

Le débit est mesuré mais permissif. On passe à :

- **≥ 600 kb/s** → vert, continuer.
- **300 – 600 kb/s** → orange, continuer avec avertissement *« Connexion limitée, certaines questions peuvent mettre du temps à charger. »*
- **< 300 kb/s** → **bloquant**. Bouton **Refaire le test** + suggestion *« Rapprochez-vous du Wi-Fi ou passez en 4G. »*

### 5. Suppression de l'auto-avance prématurée

Aujourd'hui, dès que micro + caméra sont OK, on lance un timer de 1,2 s qui passe à l'écran suivant — **sans attendre le test son ni le test débit**. On retire cet auto-skip et on attend que **les 4 tests soient verts** (ou orange acceptés) pour activer le bouton **Commencer**.

### 6. Lien « Passer » conservé mais discret

Pour ne pas bloquer les sessions de démo internes, le lien « Passer » reste, mais déplacé tout en bas avec un libellé court.

## Détails techniques

- **Fichier modifié principal :** `src/pages/InterviewDeviceTest.tsx`.
- Nouveau bip audio : data-URI inline ou petit fichier dans `public/` (~5 kB).
- Détection in-app browser : helper local `detectUnsupportedBrowser()` retournant `{ supported: boolean, reason?: string, suggestion?: string }`.
- Test `MediaRecorder` : helper async qui fait `getUserMedia` → `new MediaRecorder` → `start(250)` → attendre 1 chunk → `stop()` + cleanup tracks.
- Pas de changement côté `InterviewStart.tsx`, ni côté backend.

## Hors périmètre (pour plus tard si besoin)

- Watchdog de récupération en cours d'entretien (option B précédente).
- Logs analytiques pour mesurer combien de candidats sont bloqués par chaque test.

Si tu valides je l'implémente.
