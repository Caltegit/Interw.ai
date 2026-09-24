# Accélérer le tableau de bord et les données candidats

## Diagnostic vérifié

Le service de données et la connexion sont disponibles. Il n’y a pas de panne générale constatée.

Les lenteurs viennent principalement de la manière dont les données sont demandées :

- la requête la plus lente utilisée par les listes candidats prend **0,85 seconde en moyenne** et a déjà atteint **7,8 secondes** ;
- la page d’un poste recharge actuellement **toutes ses sessions et tous ses rapports toutes les 15 secondes**, même si seulement 25 candidats sont affichés ;
- le tableau de bord attend plusieurs vagues successives de demandes avant d’afficher ses données ;
- il télécharge notamment les **1 078 sessions en attente** pour calculer seulement deux compteurs ;
- il peut parcourir jusqu’à **200 postes, leurs sessions et leurs rapports** pour n’en afficher que cinq ;
- les moyennes d’un poste téléchargent les rapports complets puis font les calculs dans le navigateur ;
- le volume actuel est de **2 262 sessions candidat**, **15 543 messages** et **447 rapports sur 60 jours** : ces lectures intégrales deviennent désormais visibles pour l’utilisateur.

La nouvelle roue ajoute une petite donnée aux rapports, mais rien ne prouve qu’elle soit la cause de la dégradation. Le problème mesuré est surtout l’accumulation de lectures trop larges et répétées.

## Correction proposée

### 1. Tableau de bord

- Remplacer les gros téléchargements par une synthèse calculée directement dans la base : compteurs, moyenne, évolution, recommandations et cinq meilleurs candidats.
- Retourner directement les cinq postes récents avec leur nombre d’entretiens analysés, sans charger toutes leurs sessions.
- Exécuter en parallèle les demandes qui ne dépendent pas les unes des autres.
- Afficher chaque zone dès que ses données sont prêtes, au lieu de garder tout le tableau de bord vide jusqu’à la fin.

### 2. Listes candidats dans un poste

- Mettre en place une vraie pagination de **25 candidats côté données**, au lieu de télécharger toute la liste puis de la découper dans l’écran.
- Charger uniquement les rapports des 25 candidats affichés.
- Appliquer recherche, filtres et tri directement lors de la demande afin qu’ils continuent à porter sur tous les candidats du poste.
- Remplacer le rechargement intégral toutes les 15 secondes par une actualisation légère et ciblée ; conserver une mise à jour automatique des nouveaux rapports.
- Garder les sélections, décisions, notes, vues cartes/tableau et actions groupées existantes.

### 3. Moyennes et fiches candidat

- Calculer les moyennes du poste dans la base et ne renvoyer que les résultats utiles à la fiche candidat.
- Éviter de télécharger tous les rapports complets pour afficher les moyennes Fit, Orale, Attitude, Profil et la roue Interw.
- Conserver strictement les formules et valeurs actuellement affichées : il s’agit d’un déplacement du calcul, pas d’un changement de scoring.

### 4. Base de données

- Vérifier le plan réel des requêtes lentes avant toute modification d’index.
- Ajouter uniquement les index confirmés utiles pour les filtres par poste, statut, date et décision recruteur.
- Mesurer à nouveau les mêmes demandes après correction afin de confirmer le gain.

## Impact et risques

- **Recruteur :** le tableau de bord doit afficher ses blocs progressivement ; les listes candidats doivent charger seulement la page visible et répondre plus vite aux filtres.
- **Candidat :** aucun changement prévu dans le passage d’entretien, l’enregistrement, la fin de session ou les messages.
- **Scoring et rapports :** aucune formule, note, matrice, transcription ou analyse ne sera modifiée.
- **Sécurité :** les restrictions par organisation restent appliquées ; les nouvelles synthèses seront limitées à l’organisation connectée.
- **Risque principal :** une pagination mal raccordée pourrait donner un nombre de pages ou un résultat de filtre incorrect. Les totaux seront comparés avant/après sur plusieurs postes volumineux.
- **Capacité du service :** aucune augmentation n’est proposée à ce stade. Les mesures détaillées de capacité n’ont pas pu être obtenues ; il serait incorrect d’affirmer que la taille du service est en cause sans cette preuve.

## Vérifications après correction

- Comparer les totaux, scores, décisions et résultats de recherche avant/après sur plusieurs postes.
- Mesurer le temps du tableau de bord, d’une liste candidat et d’une fiche candidat, ainsi que le nombre de demandes envoyées.
- Vérifier qu’aucun chargement intégral ne se répète toutes les 15 secondes.
- Exécuter un test de bout en bout côté candidat : accès, test du matériel, démarrage et continuité du parcours.
- Exécuter un test de bout en bout côté recruteur : tableau de bord, ouverture d’un poste, pagination, filtres, ouverture d’une fiche et retour à la liste.
- Ne déclarer la correction terminée qu’après ces mesures et ces deux tests ; signaler explicitement tout test bloqué.
