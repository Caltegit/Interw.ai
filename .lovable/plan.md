## Ce que j’ai confirmé
- Les sessions touchées ont bien leurs **15 clips** et la **Q15 pointe vers `q14.webm`** en base pour Anne Mascarelli, Guillaume Breton et Léa Fulco.
- Le problème restant ressemble donc davantage à un **blocage du lecteur / rechargement de source / état interne du player** qu’à une absence de donnée.
- Je ne propose **pas** de retirer l’autoplay globalement à ce stade : ce serait un contournement risqué, pas un correctif de fond.

## Plan
1. **Fiabiliser le chargement du clip dans `SessionVideoNavigator`**
   - Supprimer les états ambigus entre `key={current.url}`, `src` direct sur `<video>`, `stopCurrent()`, `setIndex()` et `shouldAutoPlay`.
   - Mettre un flux de chargement unique : changement de clip, reset propre, `load()`, attente de `loadedmetadata`/`canplay`, puis `play()`.
   - Ajouter un vrai fallback si `play()` est refusé ou si la vidéo reste bloquée sans erreur native.

2. **Décorréler lecture manuelle et autoplay**
   - Garder l’autoplay seulement pour les transitions voulues.
   - Faire en sorte qu’un clic sur Play relance toujours la vidéo, même si un ancien état `shouldAutoPlay`, `pauseOnly()` ou `playPromiseRef` est resté coincé.
   - Éviter qu’une fin de clip ou un changement rapide de question écrase le démarrage de la Q15.

3. **Renforcer le diagnostic visible sur le lecteur**
   - Afficher un état clair quand la source est chargée mais ne démarre pas.
   - Journaliser la cause utile : source ciblée, index, événement reçu, rejet éventuel de `play()`, erreur média, timeout de chargement.
   - Conserver le bouton de réparation, mais sans le confondre avec le bug de lecture.

4. **Vérifier le rattachement rapport → clip uniquement si nécessaire**
   - Garder le mapping actuel, mais sécuriser le cas où la Q15 est bien sélectionnée dans l’UI alors que le `<video>` reste sur l’ancienne source.
   - Contrôler que le `messageId` résolu pour Q15 déclenche bien un vrai changement de clip côté lecteur.

5. **Valider avant de conclure**
   - Tester le play de la **Q15** sur les cas connus.
   - Vérifier qu’on ne casse ni les autres questions, ni la navigation précédente/suivante, ni le mini-lecteur épinglé.
   - Ne confirmer la correction qu’après vérification réelle dans le preview et sur les signaux utiles.

## Détails techniques
- Fichiers visés :
  - `src/components/session/SessionVideoNavigator.tsx`
  - `src/components/session/SessionReportView.tsx`
  - éventuellement `src/hooks/queries/useSessionDetail.ts` si un refetch perturbe le lecteur
- Point suspect principal : la combinaison **`<video key={current.url}>` + mutations directes de `src` + autoplay conditionnel + portail/sticky host**.
- Hypothèse prioritaire : la Q15 existe, mais le lecteur entre dans un **état bloqué** au moment du dernier changement de clip.