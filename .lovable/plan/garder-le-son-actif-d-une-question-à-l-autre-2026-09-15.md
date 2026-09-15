# Garder le son actif d'une question à l'autre

## Cause confirmée

Constat observé sur le lecteur de la fiche candidat (`SessionVideoNavigator.tsx`) :

1. la première question se lance avec le son ;
2. au passage à la question suivante, le son est coupé ;
3. le son reste coupé pour toutes les questions qui suivent.

Ce n'était pas le comportement d'origine. Cette coupure a été ajoutée le 12 mai 2026, pour éviter que la lecture soit refusée par le navigateur quand elle démarre sans clic direct.

Reproduit et mesuré ce soir sur une fiche candidat, question par question : question 1 son actif, question 2 son coupé, questions 3 et 4 son coupé. À chaque passage de question, le navigateur renvoie une interruption de la demande de lecture (la source est remplacée juste après le lancement). Le code ne remet alors jamais le son.

À partir de là, la vidéo reste coupée. Pire : à la question d'après, le code lit l'état actuel (« déjà coupé ») et en déduit qu'il faut rester coupé. Le son est donc perdu pour toute la suite de la fiche — exactement ce que tu observes.

Le même schéma existe dans le second lecteur, `SessionClipPlayer.tsx`.

## Correction proposée

Mémoriser l'intention réelle du recruteur plutôt que l'état momentané de l'élément vidéo :

- une mémoire « le son doit être actif », vraie par défaut, mise à jour uniquement quand le recruteur coupe ou remet le son lui-même (contrôles natifs de la vidéo) ;
- après chaque tentative de lecture, réussie **ou** échouée, rétablir cet état — plus de son coupé définitivement à cause d'une lecture interrompue ;
- rétablir aussi cet état au chargement de chaque nouvelle question ;
- appliquer exactement la même logique dans `SessionClipPlayer.tsx`.

Le contournement du blocage navigateur est conservé (coupure momentanée le temps du démarrage), il devient simplement réversible dans tous les cas.

## Impact

Construction de l'application : risque faible. Deux fichiers d'affichage sont modifiés, rien d'autre. Aucune migration, aucun changement de stockage, de sécurité, de transcription, de scoring, de matrice ni de rapport.

Recruteur : le son reste actif de la première à la dernière question. S'il coupe le son volontairement, ce choix est respecté jusqu'à ce qu'il le remette. Aucun changement visuel.

Candidat : aucun changement, le parcours d'entretien n'utilise pas ces lecteurs.

Risque résiduel : sur un navigateur très strict, la toute première lecture peut démarrer muette une fraction de seconde avant que le son revienne — comportement déjà présent aujourd'hui.

## Tests E2E après approbation

1. Test candidat : parcours d'entretien de démonstration, vérification que l'enregistrement démarre normalement et qu'aucune erreur n'apparaît.
2. Test recruteur : ouverture d'une fiche candidat à plusieurs questions, lecture de la question 1, passage aux questions 2, 3 et 4, contrôle que le son reste actif à chaque passage, puis coupure manuelle du son et vérification qu'elle est bien conservée.
