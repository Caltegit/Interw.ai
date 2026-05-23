## Objectif
Garantir que le rapport déjà affiché reste visible pendant toute la durée d'une régénération, même si une requête intermédiaire renvoie temporairement `null`.

## Diagnostic
Côté backend, `generate-report` n'efface plus l'ancien rapport (upsert) et `useRegenerateReport` ne le supprime plus non plus. Pourtant l'utilisateur voit le rapport disparaître. Le risque restant est côté UI : `useSessionDetail` rafraîchit toutes les 5 s et un `report` momentanément `null` (refetch incomplet, erreur réseau ponctuelle, état pendant l'upsert d'une autre fonction d'analyse) fait basculer la page sur la carte « Rapport non encore généré ».

## Ce que je vais faire
1. Dans `SessionDetail`, mémoriser le dernier rapport non vide vu pour la session courante.
2. Tant que la régénération est en cours **ou** tant que la requête est en cours de rafraîchissement, afficher ce dernier rapport plutôt que l'écran vide.
3. Ajouter un repère visuel discret « Régénération en cours… » au-dessus des cartes pendant `regenerate.isPending`, pour que l'utilisateur sache que ce qu'il voit est l'ancien rapport.
4. Mettre à jour le cache et la mémoire locale dès que le nouveau rapport arrive afin que l'affichage bascule sans flash.

## Détails techniques
- Fichier modifié : `src/pages/SessionDetail.tsx`.
- Utiliser un `useRef` + `useEffect` pour conserver le dernier `report` non nul lié au `sessionId` courant ; réinitialiser quand le `sessionId` change.
- Calculer `displayReport = data?.report ?? lastReportRef.current` et l'utiliser dans tous les rendus déjà conditionnés sur `report`.
- Le bandeau « Régénération en cours… » s'appuie sur `regenerate.isPending`, en réutilisant les tokens existants (couleur primary, fond léger).

## Périmètre
- Aucun changement côté edge functions ni base de données.
- Aucune modification des cartes existantes.
- Comportement inchangé quand il n'y a aucun rapport (premier passage) : on continue d'afficher la carte « Rapport non encore généré ».