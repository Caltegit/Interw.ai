Exclure les sessions « cancelled » des compteurs affichés sur la page Projet.

Dans `src/pages/ProjectDetail.tsx` :

- Calculer `nonCancelledSessions = sessions.filter(s => s.status !== 'cancelled')`.
- Remplacer les 4 usages de `sessions.length` :
  - condition d'affichage des chips (ligne 609)
  - libellé de l'onglet « Sessions (N) » (ligne 637)
  - condition d'état vide (ligne 643)
  - compteur « X / Y » au-dessus de la liste (ligne 672)

Les sessions annulées restent stockées en base et utilisables pour la traçabilité, mais n'apparaissent plus dans aucun compteur visible côté recruteur.
