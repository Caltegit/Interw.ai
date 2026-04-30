Objectif
Corriger le retour vidéo candidat sur mobile dans l’écran d’entretien, car il n’apparaît toujours pas alors que le bouton « Passer la question » est bien visible.

Constat confirmé
- Le bloc mobile du retour vidéo existe bien dans `src/pages/InterviewStart.tsx` avec `muted`, `playsInline`, `autoPlay` et `ref={setVideoEl}`.
- Le flux caméra est bien démarré dans `beginInterview()` via `startVideoStream()`.
- En revanche, la page de reprise de session ne redémarre jamais explicitement le flux caméra.
- Le test navigateur mobile montre qu’aucun élément vidéo n’est présent/actif au moment observé, et la capture montre surtout que le parcours mobile arrive d’abord sur l’écran de vérification technique.
- Le comportement est donc fragile sur mobile, surtout lors des remises en place du DOM et des reprises de session.

Plan
1. Fiabiliser l’attachement du flux caméra au retour vidéo mobile
- Ajouter une routine dédiée pour rattacher le `MediaStream` à tout élément vidéo monté, sans dépendre uniquement du callback `ref`.
- Déclencher cette routine quand :
  - le flux caméra démarre,
  - `readyToStart` passe à `true`,
  - la question ou la mise en page change,
  - la page est reprise après interruption.
- Garder l’affectation synchrone dans le geste utilisateur pour rester compatible mobile.

2. Corriger explicitement le cas de reprise de session
- Au clic sur « Reprendre », relancer `startVideoStream()` si aucun flux n’est présent ou si les pistes sont arrêtées.
- Réattacher immédiatement le flux au retour vidéo mobile et desktop après la reprise.
- Éviter les doubles créations de flux si un flux valide existe déjà.

3. Rendre le rendu mobile plus robuste
- Vérifier que le bloc vidéo mobile est toujours rendu dès que l’entretien est lancé, indépendamment de l’état du lien « Passer la question ».
- Vérifier qu’aucune condition de rendu ni remonte du DOM ne fait disparaître le `<video>` mobile au changement d’étape.
- Conserver le positionnement actuel à gauche du lien/bouton.

4. Ajouter un test mobile dédié
- Ajouter un test E2E mobile qui :
  - ouvre le parcours candidat sur un petit viewport,
  - passe le formulaire puis l’écran technique,
  - lance l’entretien,
  - vérifie que `data-testid="interview-self-video-mobile"` est visible,
  - vérifie que son `srcObject` est bien défini.
- Ajouter si nécessaire un scénario de reprise mobile pour éviter les régressions.

Détails techniques
- Fichier principal : `src/pages/InterviewStart.tsx`
- Tests à compléter : `tests/e2e/interview-start-media.spec.ts` ou nouveau fichier E2E mobile dédié
- Idée d’implémentation : centraliser une fonction du type `attachSelfViewStream()` qui :
  - vérifie `streamRef.current`,
  - vérifie l’état des pistes (`readyState !== "ended"`),
  - assigne `srcObject`,
  - relance `play()` en silence si nécessaire.

Résultat attendu
- Sur mobile, le retour vidéo candidat reste visible pendant l’entretien.
- Après remount ou reprise de session, le flux est réaffiché correctement.
- Un test automatique couvre désormais ce cas précis.