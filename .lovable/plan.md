

## Lancement automatique des tests micro et caméra

### Ce qui change

Sur l'écran « Vérification technique » (`/session/:slug/test/:token`), les deux tests démarrent automatiquement à l'arrivée sur la page, sans clic sur « Tester ».

- À l'ouverture : le test caméra et le test micro se lancent en parallèle.
- Les boutons « Tester » disparaissent de l'état initial.
- Un bouton « Réessayer » reste affiché en cas d'erreur (refus de permission, pas de périphérique).
- Le bouton « Commencer la session » s'active dès que le micro est validé, comme aujourd'hui.

### Détails techniques

Fichier modifié : `src/pages/InterviewDeviceTest.tsx`

- Ajouter un `useEffect` au montage qui appelle `testCam()` puis `testMic()`.
- Conserver les fonctions `testCam` et `testMic` à l'identique (logique inchangée).
- Retirer les boutons « Tester » de l'état `idle` (ils ne servent plus puisque le lancement est automatique). Garder le bouton « Réessayer » sur l'état `error`.
- Le nettoyage des flux au démontage (`stopAll`) reste en place.

### Hors champ

- Pas de changement de la logique d'évaluation du micro (toujours validé même en silence, seule la permission compte).
- Pas de modification du flux suivant (`/session/:slug/start/:token`).

