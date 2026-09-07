# Connecteur IA : simulation Marie Paquer + amélioration des outils

## 1. Simulation corrigée — Marie Paquer (Ads up)

Ma première mesure était fausse : j'avais utilisé le mauvais identifiant. Refaite avec son vrai compte, Marie est bien propriétaire d'Ads up, avec le rôle administrateur (pas super-administrateur).

| Outil | Ce que Marie obtient | Hors Ads up |
| --- | --- | --- |
| Lister les postes | 6 postes (soit la totalité des postes Ads up) | 0 |
| Lister les candidats | 94 entretiens Ads up | 0 |
| Rapport d'entretien | 47 rapports Ads up | 0 |
| Transcription | 763 échanges Ads up | 0 |

Le cloisonnement est bon : le connecteur agit avec le compte de la personne connectée, sans aucun privilège supplémentaire. Le test sur Domaine Chappelle (Albo) a été fait avec un compte super-administrateur, qui voit volontairement tout : ce n'est pas une fuite.

Un point reste à corriger côté sécurité : une règle autorise **toute personne connectée** à lire un rapport dès qu'un lien de partage actif existe, sans vérifier son entreprise. Cela concerne 253 rapports d'autres entreprises aujourd'hui.

## 2. Les deux vrais manques du connecteur

Le retour est juste :

- « Lister les candidats » ne renvoie ni score, ni recommandation, ni détail par critère. Pour répondre à « qui sont les meilleurs ? », l'assistant doit ouvrir les rapports un par un.
- La liste plafonne à 100 résultats sans dire qu'il en reste. Sur un poste à 213 candidats, l'assistant croit avoir tout vu.

### Ce que je change

« Lister les candidats » renvoie désormais, pour chaque candidat : score global, recommandation, note par critère, en plus des informations actuelles. Deux nouveaux réglages : un tri (par score ou par date) et une pagination avec le nombre total et un curseur pour la suite. L'assistant indique alors clairement « 100 sur 213 » et peut demander la suite.

Rien d'autre ne change : les outils restent en lecture seule et le périmètre de données est identique.

## 3. Détails techniques

- Nouvelle vue `mcp_candidats` en `security_invoker = on` : `sessions` jointe à `reports` (score, recommandation, `criteria_scores`), `is_demo` exclu. Les règles d'accès des tables sous-jacentes continuent de s'appliquer telles quelles, donc aucun élargissement d'accès. Grants : `authenticated`, `service_role`.
- `src/lib/mcp/tools/list-candidats.ts` : lecture sur `mcp_candidats`, nouveaux paramètres `sort_by` (`score` | `date`, défaut `date`), `order` (`asc` | `desc`), `offset`, `limit` (max 100). Réponse enrichie de `total`, `offset`, `next_offset` (nul si fin de liste) et texte explicite du type « 100 candidats sur 213 ». `count: "exact"` sur la requête.
- Migration séparée pour la sécurité : suppression des règles `Authenticated can view shared reports` (`reports`) et `Authenticated can view shared session messages` (`session_messages`). Les partages nominatifs restent couverts par `has_project_access`, et l'accès public par lien passe par le chemin dédié — à revalider après migration.
- Le connecteur `supabase/functions/mcp/index.ts` est régénéré automatiquement à partir de `src/lib/mcp/`, puis déployé.
- Vérification finale : rejouer les comptages pour Marie (attendu 6 / 94 / 47 / 0 hors Ads up) et appeler la liste triée par score sur un poste à plus de 100 candidats.
