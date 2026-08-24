# Fiabiliser le micro candidat

## Ce que j'ai vérifié dans le code et les données

Chiffres réels (sessions terminées, hors démo) :

| Période | Sessions terminées | Réponses candidat < 200 caractères | Zéro réponse |
|---|---|---|---|
| 30 derniers jours | 184 | 16 (8,7 %) | — |
| 90 derniers jours | 460 | 24 | 14 |

Une session terminée sur onze est quasi vide côté parole candidat, alors que la moyenne est de ~7 100 caractères. Ce ne sont pas des candidats laconiques : c'est le symptôme d'une capture audio perdue.

### Cause 1 — Aucune trace serveur : on répare à l'aveugle

`src/lib/logger.ts` écrit uniquement dans la console du navigateur et dans un tampon mémoire de 200 lignes. Tous les événements micro déjà instrumentés (`mic_health_track_dead`, `mic_too_quiet`, `mic_health_silent`, `interview_media_access_failed`, `interview_audio_recorder_error`, `interview_switch_audio_device_failed`) disparaissent à la fermeture de l'onglet. Aucune colonne micro sur la table des sessions. Conséquence : chaque incident est traité comme un cas isolé, on ne sait pas quel navigateur, quel périphérique ni quelle étape casse, et on ne peut pas mesurer si un correctif a marché.

### Cause 2 — L'erreur d'accès média est avalée

Dans `startVideoStream` (`src/pages/InterviewStart.tsx`), la demande caméra + micro est faite en un seul appel. Si le micro seul est indisponible (occupé par Teams/Zoom, périphérique débranché, contrainte `deviceId: { exact: … }` invalide), l'appel entier échoue. Le repli tente le périphérique par défaut, et si ça échoue aussi, le candidat voit « Caméra inaccessible. Veuillez autoriser l'accès à la caméra. » — un message faux, qui ne mentionne jamais le micro. Les types d'erreur (`NotAllowedError` = refus, `NotReadableError` = périphérique occupé, `OverconstrainedError` = périphérique disparu) ne sont pas distingués, donc aucune consigne de réparation utile n'est donnée.

### Cause 3 — Le contexte micro ne survit pas au parcours

La calibration du test technique est écrite dans `sessionStorage`, le micro préféré dans `localStorage`. Si le candidat change d'onglet, de navigateur, ou arrive directement sur le lien d'entretien sans repasser le test, la calibration est perdue : le watchdog retombe sur des seuils génériques, trop stricts pour une voix douce et trop laxistes en environnement bruyant. Rien ne bloque le démarrage d'un entretien sans test micro validé.

### Cause 4 — Aucune preuve côté serveur qu'une réponse a été captée

`transcribe-session` ne vérifie ni la taille, ni la durée, ni l'énergie du fichier audio reçu. Un fichier de 2 ko silencieux produit une transcription vide ou hallucinée, la session passe en « terminée », et le problème n'est découvert qu'au moment où un recruteur lit un rapport incohérent.

### Cause 5 — La bascule de micro à chaud reste fragile

`switchAudioDevice` puis `restartActiveRecorderAfterAudioSwap` redémarrent uniquement l'enregistreur audio auxiliaire ; c'est le bon choix (redémarrer la vidéo casserait le conteneur), mais il n'existe aucune vérification que la nouvelle piste produit réellement du signal après la bascule. Un candidat peut « changer de micro », voir le message « Micro changé », et continuer à enregistrer du vide.

## Le plan

Cinq lots, livrables et testables indépendamment, du plus structurant au plus fin.

### Lot 1 — Voir ce qui casse (télémétrie micro)

- Nouvelle table `mic_events` (session_id, token candidat, event, données JSON, navigateur, OS, périphérique, horodatage), avec RLS : insertion autorisée pour un porteur de lien candidat valide, lecture réservée aux super admins.
- Sink réseau dans `logger.ts` : les événements dont le nom commence par `mic_`, `interview_media_`, `interview_audio_` partent en lot, en `sendBeacon`, sans jamais bloquer l'entretien.
- Snapshot de fin de session : périphérique final, pics RMS observés, nombre de bascules de micro, statuts dégradés cumulés.
- Onglet « Qualité micro » dans `/admin/system` : taux d'incident par jour, par navigateur, par OS, et liste des sessions concernées avec lien direct.

Sans ce lot, les suivants sont invérifiables. C'est le prérequis.

### Lot 2 — Demander le micro proprement

- Séparer la demande : micro d'abord, caméra ensuite. Une caméra manquante ne doit plus faire échouer le micro, et inversement.
- Repli en cascade sur le micro : périphérique préféré → périphérique par défaut → contraintes minimales (`audio: true`).
- Messages d'erreur typés et actionnables, en français : refus de permission, périphérique occupé par une autre application, périphérique débranché, aucun micro détecté — chacun avec la manœuvre de réparation correspondante et un bouton « Réessayer ».
- `MicBlockingDialog` enrichi avec les consignes spécifiques Chrome / Safari / Edge et iOS / Android.

### Lot 3 — Ne plus démarrer un entretien sans micro prouvé

- Persister la calibration côté serveur (rattachée à la session) au lieu du seul `sessionStorage`, avec repli local.
- Rendre le test micro bloquant : sans mesure valide (pic et durée active au-dessus des seuils existants), le bouton de démarrage propose « Refaire le test micro » plutôt que de laisser passer.
- Contrôle éclair juste avant la première question : 1,5 s de mesure, et si le signal est plat, affichage de l'écran de réparation avant que la moindre question ne soit posée.

### Lot 4 — Vérifier la bascule et la reprise

- Après tout changement de micro ou toute réacquisition de piste, mesure de confirmation de 1 s : le message « Micro changé » n'apparaît que si du signal est effectivement présent, sinon on reste sur l'écran de réparation avec un autre périphérique proposé.
- Réacquisition automatique unique en cas de piste morte, avec repli sur le périphérique par défaut, puis journalisation du résultat.

### Lot 5 — Filet de sécurité serveur

- `transcribe-session` mesure taille, durée et énergie moyenne de chaque fichier audio de réponse ; en dessous du seuil, la réponse est marquée `audio_silent` et n'est plus notée (score neutre, cohérent avec la règle `evidence: none` déjà en place dans la matrice).
- Une session dont plus de la moitié des réponses sont `audio_silent` est signalée comme anomalie dans le suivi de récupération candidat existant, au lieu d'apparaître comme une session terminée normale.

## Détails techniques

- Table `mic_events` créée avec `GRANT` explicites (`insert` pour `anon` via politique liée au token candidat, `select` pour `authenticated` restreint aux super admins) et index sur `(session_id, created_at)`.
- Envoi non bloquant : file en mémoire vidée toutes les 5 s et sur `visibilitychange`, via `navigator.sendBeacon` avec repli `fetch(keepalive: true)`. Aucun `await` dans le chemin critique de l'entretien.
- Réutilisation de `measureMicLevel` de `src/lib/micLevel.ts` pour les contrôles éclair — pas de nouvelle mécanique de mesure.
- Aucune modification du `MediaRecorder` vidéo pendant une question : la règle du conteneur unique reste intacte.
- Mesure d'énergie serveur par décodage léger de l'en-tête et échantillonnage du PCM, sans dépendance lourde ajoutée.

## Ordre proposé

Lot 1 d'abord, seul, publié et laissé tourner 48 h pour obtenir des chiffres réels par navigateur. Les lots 2 et 3 ensuite, qui couvrent l'essentiel du vécu candidat. Les lots 4 et 5 pour finir.
