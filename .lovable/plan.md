# Garder le son actif d'une question à l'autre

## Cause confirmée

Dans le lecteur de la fiche candidat (`SessionVideoNavigator.tsx`), la fonction `safePlay()` fait ceci à chaque démarrage de lecture :

1. elle coupe le son (`muted = true`) pour contourner le blocage de lecture automatique des navigateurs ;
2. elle lance la lecture ;
3. elle ne remet le son **que si** la lecture a démarré sans être interrompue. À l'ouverture de la fiche, la lecture démarre proprement : le son revient, c'est bien ce que tu constates sur la première question.

Au passage à la question suivante, la source vidéo est remplacée puis rechargée juste après le lancement de lecture. Le navigateur annule alors la demande de lecture en cours (erreur classique « play() interrompu par un nouveau chargement »). Ce cas tombe dans la branche d'échec : le son n'est jamais rétabli.

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
