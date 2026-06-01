# Plan

## Ce que je vais corriger

1. **Améliorer le diagnostic du lecteur vidéo**
   - Ajouter une vraie détection d’erreur média dans `SessionVideoNavigator`.
   - Capturer le clip courant, la question, l’URL média et le type d’échec pour distinguer :
     - vidéo absente en base,
     - vidéo présente mais illisible,
     - blocage navigateur/origine croisée,
     - média corrompu ou introuvable.
   - Afficher un message court et utile dans l’interface au lieu du simple état cassé du lecteur.

2. **Rendre le rapport robuste quand la transcription existe mais que la vidéo ne passe pas**
   - Préserver la navigation vers la bonne question même si la vidéo est indisponible.
   - Ajouter un repli propre pour ces cas : transcript toujours visible, et lecture audio si disponible.
   - Éviter qu’un clip en erreur casse l’état du sélecteur ou renvoie vers une autre question.

3. **Corriger la sélection/navigation des questions si elle se désynchronise**
   - Vérifier et fiabiliser la logique qui relie `messages`, `clips`, `question_id` et l’index affiché.
   - Corriger le libellé/état sélectionné du dropdown pour que la question affichée corresponde toujours au clip actif.

4. **Valider sur les cas signalés**
   - Rejouer le cas Anne Mascarelli.
   - Rejouer le cas Guillaume Breton.
   - Confirmer dans la preview que la Q15 reste sélectionnée et que l’interface explique clairement pourquoi la vidéo ne se lit pas si le fichier est bloqué ou manquant.

## Diagnostic déjà trouvé

- La page charge bien les `session_messages`, donc la **transcription est présente**.
- La Q15 apparaît bien dans le sélecteur, donc il ne s’agit pas seulement d’une question absente du rapport.
- Le navigateur remonte un échec média de type **blocage d’origine croisée** sur les fichiers vidéo en preview (`NotSameOriginAfterDefaultedToSameOriginByCoep`).
- Il faut donc corriger **à la fois** le diagnostic UI et la robustesse de navigation, pas seulement l’autoplay.

## Détails techniques

- Fichiers visés :
  - `src/components/session/SessionVideoNavigator.tsx`
  - `src/components/session/SessionReportView.tsx`
  - éventuellement `src/hooks/queries/useSessionDetail.ts` si un enrichissement léger du diagnostic est utile côté données
- Validation : preview + logs réseau + sélection manuelle de la question 15 sur les sessions concernées.