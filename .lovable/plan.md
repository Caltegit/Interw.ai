## Objectif

Empêcher un candidat dont le navigateur ne supporte pas la reconnaissance vocale (cas de Daphnée) de démarrer l'entretien. Aujourd'hui le test technique affiche un avertissement mais laisse passer.

## Cause du problème

`src/lib/browserCompat.ts` bloque les webviews intégrées (LinkedIn, Gmail…) et Firefox iOS, mais pas **Firefox desktop / Firefox Android**, qui n'ont pas l'API `webkitSpeechRecognition`. Côté `InterviewDeviceTest.tsx`, le test STT (lignes 322-355) tombe en `warning` au lieu de bloquer, et un bouton « Continuer quand même » permet de passer outre.

## Changements

### 1. `src/lib/browserCompat.ts`
- Ajouter une vérification `SpeechRecognition` / `webkitSpeechRecognition` dans `detectBrowserCompat`. Si absente → `level: "blocked"` avec le motif : « Votre navigateur ne prend pas en charge la reconnaissance vocale nécessaire à l'entretien. Ouvrez ce lien dans Chrome (Android, Mac, PC) ou Safari (iPhone). »
- Conséquence : Firefox (toutes plateformes), Brave avec Shields stricts, et certains navigateurs alternatifs sont désormais bloqués dès l'arrivée sur le test technique.

### 2. `src/pages/InterviewDeviceTest.tsx`
- Quand `browserCompat.level === "blocked"`, **supprimer le bouton « Continuer quand même »** (suppression du bloc lignes 732-740 et de la variable `browserBlocking` / `browserBypassed`). L'objectif est qu'un candidat ne puisse plus passer outre.
- Conserver le bouton « Copier le lien de l'entretien » pour qu'il puisse rouvrir l'invitation sur un autre appareil/navigateur.
- Quand le test STT échoue (`sttStatus === "warning"` actuel), passer le statut à `"error"` et bloquer `canContinue`. Message : « La reconnaissance vocale n'a pas démarré. Utilisez Chrome ou Safari pour réaliser l'entretien. »
- Ajuster `canContinue` pour exiger explicitement `sttStatus === "ok"`.
- Retirer `showSkipPrimary` (le bouton secondaire « Continuer quand même » du bas, lignes 956-960) **uniquement** quand le blocage vient du navigateur ou du STT — on garde le contournement pour les autres cas (réseau faible).

### 3. Texte d'aide
- Mettre à jour la liste « Navigateurs recommandés » (ligne 927-929) : ajouter Edge desktop comme alternative valide, préciser que Firefox n'est pas supporté.

## Hors scope
- Pas de modification de l'email d'invitation (à voir plus tard).
- Pas de fallback transcription serveur (option 2 reportée).
- Pas de changement sur le flux d'entretien lui-même.

## Vérification
- Test manuel : ouvrir un lien d'entretien dans Firefox → carte « Navigateur compatible » rouge, CTA désactivé, pas de contournement possible.
- Chrome desktop : tout reste vert, comportement inchangé.
- Test E2E existant `candidate-journey.spec.ts` reste vert (Chromium headless = OK).
