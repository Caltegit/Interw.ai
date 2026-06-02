# Plan

## Objectif
Éliminer durablement les vidéos illisibles sur la dernière question et les questions de fin de session, sans réintroduire les anciens bugs de lecture.

## Stratégie
On traite le problème comme un **bug de pipeline média**, pas comme un bug d’interface.
Le plan vise à :
- empêcher la création de nouveaux fichiers corrompus,
- rendre cohérent le format vidéo de bout en bout,
- réparer les sessions déjà touchées quand des chunks exploitables existent,
- vérifier le résultat sur des cas réels avant de conclure.

## Étape 1 — Stabiliser définitivement l’écriture des vidéos
Mettre le front d’enregistrement sur un pipeline unique et cohérent :
- utiliser le **format réellement produit** par `MediaRecorder` pour chaque question,
- propager ce format jusqu’aux **chunks**, au **fichier final** et au **manifest**,
- éviter tout mélange entre deux questions successives,
- garantir qu’un recorder précédent ne peut plus injecter de données dans la question suivante.

**Résultat attendu :** une nouvelle interview ne peut plus produire une dernière question avec extension, MIME ou contenu incohérents.

## Étape 2 — Corriger la finalisation de fin de session
Fiabiliser la logique qui tourne quand l’onglet se ferme, que le téléphone se verrouille ou que la page disparaît :
- faire en sorte que `finalize-abandoned-session` reconstruise dans le **bon format**,
- ne plus supposer que tout est en `.webm`,
- reconstruire le bon fichier final (`.webm` ou `.mp4`) selon le manifest ou les chunks réellement présents,
- conserver la compatibilité avec les sessions déjà commencées sous l’ancien comportement.

**Résultat attendu :** la dernière question reste lisible même si la session se termine brutalement.

## Étape 3 — Renforcer la réparation des sessions déjà cassées
Améliorer la fonction de réparation pour qu’elle sache traiter les cas hybrides produits jusqu’ici :
- détecter le format réel au lieu de deviner,
- chercher les chunks dans le bon dossier avec la bonne extension,
- reconstruire même si le fichier final existant est trompeur ou partiellement invalide,
- mieux distinguer un fichier vraiment sain d’un fichier seulement “plausible”.

**Résultat attendu :** les vidéos déjà cassées peuvent être récupérées dès que les chunks bruts sont exploitables.

## Étape 4 — Garder le lecteur simple et fiable
Le lecteur ne doit pas masquer le vrai problème, mais il doit rester robuste :
- conserver le diagnostic d’erreur utile,
- garder la réparation manuelle côté RH,
- recharger proprement la source réparée,
- éviter toute “fausse solution” côté autoplay si le média source est invalide.

**Résultat attendu :** si un clip est cassé, l’interface aide à le réparer au lieu de brouiller le diagnostic.

## Étape 5 — Validation sur cas réels avant conclusion
Vérifier le correctif sur des cas concrets, pas seulement sur du code lu :
- retester le cas de la **dernière question** qui échoue encore,
- retester la session signalée où ça casse à partir de la **Q5**,
- simuler une fin brutale de session pour vérifier la reconstruction automatique,
- vérifier que les fichiers produits sont décodables et que le lecteur les lit bien.

**Résultat attendu :** on confirme à la fois la prévention des nouveaux bugs et la récupération des anciens.

## Décision sur le rollback
Je ne propose **pas** de rollback global comme solution principale.

Pourquoi :
- il ne réparera pas les vidéos déjà corrompues,
- il risque de réintroduire les problèmes corrigés récemment,
- il ne traite pas la cause structurelle : l’incohérence de format entre enregistrement, chunks, finalisation et récupération.

## Fallback de sécurité si besoin
Si on veut limiter le risque pendant le correctif, le bon fallback est **ciblé** :
- désactiver provisoirement la reconstruction automatique fautive si elle produit des fichiers incohérents,
- garder la réparation manuelle et les correctifs déjà utiles,
- réactiver la finalisation automatique une fois le pipeline validé.

## Fichiers concernés
- `src/pages/InterviewStart.tsx`
- `supabase/functions/finalize-abandoned-session/index.ts`
- `supabase/functions/recover-session-video/index.ts`
- ajustement mineur éventuel dans `src/components/session/SessionVideoNavigator.tsx`

## Critères de succès
Le problème sera considéré comme résorbé seulement si :
- une nouvelle interview complète génère des vidéos lisibles jusqu’à la dernière question,
- la fermeture d’onglet ou l’abandon ne casse plus le dernier segment,
- les sessions déjà touchées peuvent être réparées quand les chunks existent,
- le lecteur charge bien les fichiers reconstruits sans erreur de décodage.
