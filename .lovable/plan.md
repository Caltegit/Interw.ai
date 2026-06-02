# Plan

Le problème n’est plus l’autoplay : les signaux montrent surtout des **fichiers vidéo déjà corrompus ou mal assemblés**.

## Ce qu’on fait

1. **Sécuriser l’enregistrement question par question**
   - Fiabiliser `InterviewStart` pour que chaque question enregistre et uploade dans le bon dossier.
   - Supprimer le risque de mélange entre deux questions successives.
   - Utiliser le **vrai format détecté** (`webm` ou `mp4`) au lieu de forcer `webm` partout.

2. **Fiabiliser la finalisation des segments**
   - Garantir que le recorder précédent est complètement vidé avant d’en démarrer un autre.
   - Isoler les listes de chunks par question pour éviter qu’un upload tardif pollue la suivante.
   - Éviter les blobs finaux incohérents quand la transition entre questions est rapide.

3. **Renforcer la réparation côté backend**
   - Améliorer `recover-session-video` pour ne plus considérer un fichier “valide” juste parce qu’il commence par un header EBML.
   - Gérer correctement les cas de préfixe parasite, de reconstruction depuis chunks, et de format réel du média.
   - Prévoir la réparation des sessions déjà cassées, notamment celles où ça lâche à partir de la Q5 ou sur la Q15.

4. **Garder le lecteur simple, sans faux remède**
   - Ne pas retirer l’autoplay comme “solution”.
   - Conserver le lecteur actuel, avec seulement le diagnostic utile si le fichier source est irrécupérable.

5. **Valider sur les cas réels avant de conclure**
   - Re-tester la session actuelle (`9e68…`, Q15).
   - Re-tester la session signalée (`955b…`, à partir de la Q5).
   - Vérifier qu’on lit bien les fichiers réparés et que les nouvelles sessions n’en produisent plus de corrompus.

## Détails techniques

- **Fichiers visés**
  - `src/pages/InterviewStart.tsx`
  - `supabase/functions/recover-session-video/index.ts`
  - éventuellement `supabase/functions/finalize-abandoned-session/index.ts`
  - au besoin, ajustement mineur de `src/components/session/SessionVideoNavigator.tsx`

- **Causes probables à traiter en priorité**
  - mauvais rattachement des chunks à la mauvaise question
  - format réel du média ignoré (`mp4` servi comme `webm` sur certains navigateurs)
  - flush incomplet du recorder précédent
  - réparation trop naïve des fichiers déjà cassés

- **Décision produit**
  - **Je ne recommande pas un retour arrière global** : ça pourrait limiter de nouveaux dégâts, mais ça **ne réparera pas** les vidéos déjà cassées.
  - Si on veut un frein d’urgence ensuite, on pourra envisager un rollback séparé, mais la bonne correction reste la réparation du pipeline.

## Résultat attendu

- Les nouvelles interviews ne génèrent plus de segments cassés.
- Les sessions déjà touchées peuvent être réparées quand les chunks exploitables existent.
- Le lecteur n’affiche plus une erreur trompeuse liée à l’autoplay alors que le vrai souci est le média lui-même.