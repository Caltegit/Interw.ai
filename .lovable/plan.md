# Veille des entretiens exposés au défaut vidéo

## Ce que j'ai déjà mesuré

Sur les 30 derniers jours, **141 entretiens sur 148** portent le même défaut que les 7 entretiens Castalie (ancienne adresse en base, et/ou enregistrement WebM illisible sur Safari). Répartition : Castalie 27, Ads up 32, Morning 24, Tango 41, Smash Group 6, et quelques entretiens isolés ailleurs.

## Ce que la veille fera

Un écran de suivi dans le back-office administrateur, consultable à tout moment, qui répond simplement à : « est-ce que d'autres entretiens sont touchés ? »

Pour chaque entretien des 30 derniers jours contenant des réponses vidéo :

- candidat, poste, organisation, date ;
- nombre de fichiers concernés ;
- type de défaut détecté, distingué clairement :
  - **ancienne adresse** : l'entretien ne se lit plus depuis le passage en stockage privé ;
  - **WebM sans durée** : écran noir sur Safari, barre de lecture vide ailleurs ;
- compteur global : entretiens touchés / entretiens analysés sur la période.

Le relevé est calculé à chaque ouverture de l'écran : un entretien corrigé disparaît immédiatement de la liste, un nouvel entretien impacté y apparaît dès son enregistrement.

Aucune correction n'est lancée depuis cet écran : il sert uniquement à savoir et à décider.

## Détails techniques

- Requêtes de lecture sur `session_messages` (réponses candidats avec vidéo, sur 30 jours glissants), jointes à l'entretien, au poste et à l'organisation.
- Détection par format de l'adresse enregistrée : adresse absolue historique, fichier `.webm`, fichier `.mp4` au bon format.
- Accès réservé aux super administrateurs, dans la rubrique existante du back-office.
- Aucun changement sur les données, le stockage, le scoring ou les entretiens en cours.

## Vérifications

- Le relevé affiché correspond exactement aux chiffres mesurés ci-dessus.
- Un entretien sain n'apparaît pas ; les 7 entretiens corrigés ce matin n'apparaissent plus.
- Un administrateur non super administrateur ne voit pas l'écran.
