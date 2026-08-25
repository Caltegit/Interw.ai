# Livrable — diagnostic d'entonnoir, lecture seule

Aucune écriture, aucune migration, aucune modification du parcours candidat. Uniquement la production d'un document d'analyse à partir de requêtes de lecture.

## Ce qui sera produit

Un rapport PDF déposé dans tes documents, contenant :

1. **L'entonnoir chiffré**, en deux vues parallèles — par session (1 143) et par candidat dédoublonné (845) — avec l'écart entre les deux explicité.
2. **La carte de mesurabilité** des huit étapes que tu as listées : ce qui est traçable aujourd'hui, ce qui ne l'est pas, et sur quelle source. Trois étapes sont non mesurables et une repose sur des tables devenues inactives.
3. **Les deux points de rupture** identifiés : décrochage à la question 1, et décrochage en toute fin de parcours.
4. **La liste nominative des 46 sessions mal classées** — 17 sans aucune réponse, 29 incomplètes — avec organisation, projet, avancement réel, date et motif d'échec du rapport. Exportée aussi en tableur pour que tu puisses la trier.
5. **La concentration Castalie** : 11 des 17 cas sur un seul projet, avec les éléments de contexte disponibles pour orienter l'investigation.
6. **Les limites de l'analyse** : tests internes non identifiables, doublons, questions archivées après coup, impossibilité de distinguer abandon volontaire et incident technique.

## Ce qui ne sera pas fait

- Aucune correction des 46 sessions mal classées.
- Aucun ajout de traçage dans le parcours candidat.
- Aucune réactivation de la télémétrie micro.
- Aucune annulation des jobs de rapport en échec.

Ces sujets restent ouverts et documentés dans le rapport, sans mise en œuvre.

## Détails techniques

Requêtes de lecture uniquement sur `sessions`, `session_messages`, `questions`, `projects`, `organizations`, `report_jobs`, `storage.objects`, `session_attempts`, `mic_events`, `project_page_views`. Génération du PDF et du tableur hors du code applicatif, déposés dans `/mnt/documents/`. Aucun fichier du projet n'est modifié.
