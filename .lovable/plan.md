## Objectif
Éliminer le bug où la dernière vidéo du rapport échoue avec « fichier introuvable ou bloqué par le navigateur », puis sécuriser tout le flux pour qu’une réparation ne puisse plus casser une vidéo déjà présente.

## Ce que je vais faire

1. **Sécuriser `recover-session-video`**
   - Ne plus supprimer `qN.webm` / `qN.mp4` avant d’avoir confirmé qu’une reconstruction est réellement possible.
   - Vérifier d’abord qu’il existe des chunks exploitables et, pour WebM, qu’au moins un chunk contient un header EBML valide.
   - Si la reconstruction est impossible, renvoyer une erreur propre sans toucher au fichier final existant.

2. **Rendre la réparation atomique**
   - Reconstruire d’abord dans un chemin temporaire.
   - Remplacer le fichier final seulement après upload réussi.
   - Ne supprimer l’extension fantôme (`.webm` vs `.mp4`) qu’après succès complet.

3. **Empêcher le rapport de pointer vers un fichier mort**
   - Ajouter une vérification côté lecteur / réparation pour distinguer :
     - fichier réellement absent,
     - fichier présent mais illisible,
     - réparation impossible faute de chunks valides.
   - Afficher une erreur cohérente au lieu de relancer une réparation destructrice.

4. **Traiter le cas concret Q15**
   - Vérifier la session concernée où le message de Q15 existe mais où le fichier référencé n’existe plus.
   - Rejouer la réparation seulement si les chunks permettent une reconstruction saine.
   - Sinon, préserver l’état actuel et éviter toute nouvelle suppression accidentelle.

5. **Valider avant de conclure**
   - Tester le cas Q15 sur une session complète 15/15.
   - Vérifier qu’un clic sur « Réparer la vidéo » ne peut plus transformer une vidéo existante en 404.
   - Contrôler qu’une dernière question saine (`q14.webm`) reste lisible après réparation forcée et après rechargement du rapport.

## Diagnostic retenu
- **Q15 n’est pas `q15.webm` mais `q14.webm`** : l’indexation est bien en base 0, donc ce n’est pas le bug principal.
- Le vrai point dangereux est dans **`supabase/functions/recover-session-video/index.ts`** : la fonction supprime le fichier final au début de la reconstruction, avant d’avoir prouvé qu’elle peut reconstruire.
- Résultat possible : la base garde une URL vers `interviews/{sessionId}/q14.webm`, mais le fichier a été supprimé si la réparation échoue ensuite.
- J’ai aussi confirmé en base que certaines sessions complètes ont bien 15 vidéos, mais qu’au moins une session a une URL Q15 enregistrée sans objet Storage correspondant.

## Fichiers concernés
- `supabase/functions/recover-session-video/index.ts`
- `src/components/session/SessionVideoNavigator.tsx`
- éventuellement `supabase/functions/finalize-abandoned-session/index.ts` pour aligner la logique de sécurité

## Résultat attendu
- Q15 reste lisible quand le fichier existe.
- Le bouton de réparation ne casse plus une vidéo existante.
- En cas d’échec de reconstruction, on garde l’ancien fichier et on remonte une erreur explicite au lieu d’un faux succès.