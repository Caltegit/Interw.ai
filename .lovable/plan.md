# Corriger les dernières sessions candidates du tableau de bord

## Diagnostic confirmé

- **« RDV » ne désigne pas un rendez-vous ici.** Le statut technique `in_progress` est traduit par erreur par « RDV » dans le badge partagé.
- **Alix Pougte-Abadie est réellement en cours** : entretien commencé, 4 réponses enregistrées sur 6, aucun rapport pour l’instant.
- **Clémence Moreau a terminé ses 6 questions** et son rapport est en cours de génération. La capture montre encore « RDV » parce que le tableau de bord ne se rafraîchit pas automatiquement après la fin de l’entretien.
- Les deux lignes ne sont pas cliquables car le tableau de bord ajoute volontairement un lien **uniquement** lorsque le statut affiché est `completed`.
- Le bouton **« Passer »** enregistre déjà un marqueur « Question passée » et, lorsque le candidat atteint la fin, le parcours classe déjà la session comme terminée et lance le rapport. En revanche, le décompte affiché se base actuellement sur les vidéos enregistrées : une question passée peut donc être comptée à tort comme une réponse si son enregistrement contient un média.

## Correction proposée

1. Remplacer le libellé de statut candidat **« RDV »** par **« En cours »**, sans modifier la décision recruteur « RDV » utilisée ailleurs.
2. Rendre les sessions commencées et terminées cliquables depuis **Dernières sessions candidats**.
3. Rafraîchir automatiquement les données du tableau de bord pendant qu’une session récente est en cours, afin que son statut et son score apparaissent sans recharger la page.
4. Conserver les invitations encore en attente hors de cette liste et sans accès à une fiche vide.
5. Compter comme réponse uniquement une réponse réellement donnée, en excluant explicitement les marqueurs **« Question passée »**. La fiche affichera ainsi, par exemple, **« 3 réponses sur 6 questions »**.
6. Confirmer que le rapport analyse seulement les réponses disponibles, sans pénaliser les questions passées, tout en conservant les pondérations prévues sur les éléments effectivement évaluables.
7. Vérifier les trois cas : fiche en cours accessible, fin avec toutes les réponses, et fin avec plusieurs questions passées ; dans les deux derniers cas, statut **« Complété »**, rapport généré et décompte exact.

## Périmètre technique

Changements limités au badge de statut candidat, au bloc **Dernières sessions candidats**, au décompte des réponses et aux consignes de génération du rapport. Aucun changement de données ni de structure de la base.
