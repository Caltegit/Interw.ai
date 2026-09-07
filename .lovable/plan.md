# Connecteur IA : ce que verrait Marie Paquer (simulation)

J'ai rejoué en base, avec l'identité exacte de Marie Paquer (Ads up), les quatre outils du connecteur. Voici le résultat réel, puis ce qu'il faut corriger avant de lui annoncer l'installation.

## Résultat de la simulation

| Outil | Ce que Marie obtient | Sur le total |
| --- | --- | --- |
| Lister les postes | **0 poste** | 136 postes en base, dont 6 chez Ads up |
| Lister les candidats | 94 entretiens Ads up | 1 682 en base |
| Rapport d'entretien | 47 rapports Ads up | — |
| Transcription | 763 échanges Ads up | 13 009 en base |

Bonne nouvelle : aucune donnée d'une autre entreprise n'apparaît sur les candidats, rapports et transcriptions. Le connecteur ne dispose d'aucun accès privilégié : il agit avec le compte de la personne connectée, exactement comme si elle naviguait dans l'application.

Deux problèmes ressortent quand même.

## Problème 1 — Marie ne voit aucun poste

Les règles d'accès aux postes n'autorisent que trois cas : la personne a créé le poste, le poste lui a été partagé nommément, ou elle est propriétaire de l'entreprise. Marie n'est dans aucun de ces cas (Ads up appartient à un autre compte, et aucun des 6 postes ne lui est attribué). Résultat : son assistant répondra « aucun poste » et elle ne pourra pas enchaîner sur ses candidats.

À corriger : autoriser les membres d'une entreprise à voir les postes de leur entreprise, comme c'est déjà le cas pour les candidats et les rapports.

## Problème 2 — les rapports partagés sont visibles par tout le monde

Une règle laisse **toute personne connectée** lire un rapport dès qu'un lien de partage actif existe pour ce rapport, sans vérifier qu'elle appartient à l'entreprise concernée. Aujourd'hui cela expose **253 rapports d'autres entreprises**. Marie pourrait les lire si elle en connaissait l'identifiant — via le connecteur ou via l'application.

À corriger : réserver cette lecture aux personnes réellement destinataires du partage (lien public non connecté ou partage nominatif), et non à tout compte connecté.

## Détails techniques

- Correction 1 : remplacer la règle de lecture `Project visibility v3` sur `projects` par une version qui ajoute `organization_id = get_user_organization_id(auth.uid())`, en gardant les cas existants (créateur, `visible_to_user_ids`, propriétaire, super-admin).
- Correction 2 : supprimer la règle `Authenticated can view shared reports` sur `reports` et la règle jumelle `Authenticated can view shared session messages` sur `session_messages`; l'accès par lien de partage continue de passer par le chemin public dédié, et `has_project_access` couvre les partages nominatifs.
- Les deux corrections passent par une migration de base de données. Aucun changement côté interface ni côté connecteur : les outils `list_postes`, `list_candidats`, `get_rapport`, `get_transcript` restent inchangés.
- Vérification après migration : rejouer les mêmes comptages pour Marie (attendu : 6 postes, 94 candidats, 47 rapports, 0 donnée hors Ads up) et vérifier qu'un lien de partage public fonctionne toujours.
