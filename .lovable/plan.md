# Corriger les dernières sessions candidates du tableau de bord

## Diagnostic confirmé

- **« RDV » ne désigne pas un rendez-vous ici.** Le statut technique `in_progress` est traduit par erreur par « RDV » dans le badge partagé.
- **Alix Pougte-Abadie est réellement en cours** : entretien commencé, 4 réponses enregistrées sur 6, aucun rapport pour l’instant.
- **Clémence Moreau a terminé ses 6 questions** et son rapport est en cours de génération. La capture montre encore « RDV » parce que le tableau de bord ne se rafraîchit pas automatiquement après la fin de l’entretien.
- Les deux lignes ne sont pas cliquables car le tableau de bord ajoute volontairement un lien **uniquement** lorsque le statut affiché est `completed`.

## Correction proposée

1. Remplacer le libellé de statut candidat **« RDV »** par **« En cours »**, sans modifier la décision recruteur « RDV » utilisée ailleurs.
2. Rendre les sessions commencées et terminées cliquables depuis **Dernières sessions candidats**.
3. Rafraîchir automatiquement les données du tableau de bord pendant qu’une session récente est en cours, afin que son statut et son score apparaissent sans recharger la page.
4. Conserver les invitations encore en attente hors de cette liste et sans accès à une fiche vide.
5. Vérifier les deux cas : fiche en cours accessible avec les réponses déjà reçues, puis passage automatique à « Complété » et apparition du score après génération du rapport.

## Périmètre technique

Changements limités au badge de statut candidat et au bloc **Dernières sessions candidats** du tableau de bord. Aucun changement de données ni de logique d’entretien.
