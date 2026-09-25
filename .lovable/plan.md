# Accélérer le chargement du tableau de bord (et des pages candidats)

## Ce qui se passe (vérifié dans le code et les requêtes de l'aperçu)

Le serveur fonctionne. Le problème vient de la façon dont le tableau de bord récupère ses données :

1. **Il télécharge beaucoup trop de données pour afficher quelques chiffres.**
   - Pour le bloc « Derniers postes », il charge jusqu'à 200 postes avec **toutes** leurs sessions et leurs rapports, puis n'en garde que 5.
   - Pour la note moyenne, les recommandations et le top 5, il charge **tous** les rapports des 60 derniers jours, résumés complets inclus, puis compte dans le navigateur.
   - Pour « En attente », il charge toutes les sessions en attente une par une au lieu de les compter.
2. **Les requêtes s'enchaînent en 4 vagues successives** : profil, puis 7 requêtes, puis les postes, puis « à traiter », puis les rapports récents. Chaque vague attend la précédente.
3. **Des informations sont demandées plusieurs fois au même moment** : à l'ouverture, les rôles sont demandés 6 fois, le profil 5 fois, l'organisation 3 fois (menu, garde d'accès, tableau de bord lisent chacun de leur côté).
4. Sur la liste candidats d'un poste, toutes les sessions sont chargées avant d'afficher les 25 premières (constaté lors d'un diagnostic précédent).

Plus il y a de candidats, plus c'est lent : c'est pour cela que ça empire avec le temps.

## Corrections proposées

**Étape 1 — Tableau de bord calculé par la base (gain principal)**
Une seule fonction côté base renvoie directement les chiffres déjà calculés : compteurs, moyenne 30 jours, évolution, répartition des recommandations, top 5, 5 derniers postes, candidats à traiter. Le navigateur ne reçoit plus que le résultat (quelques Ko au lieu de centaines).

**Étape 2 — Supprimer les demandes en double**
Profil, rôles et organisation lus une seule fois puis partagés entre le menu, la garde d'accès et les pages.

**Étape 3 — Liste candidats paginée côté base**
Le poste ne charge que les 25 candidats affichés ; la page suivante se charge au clic.

**Étape 4 — Index**
Vérifier et ajouter les index manquants sur les colonnes filtrées (statut, date, poste, organisation).

Chaque étape est mesurée avant/après (temps réel de chargement) et je vous donne les chiffres.

## Impact

- **Candidat** : aucun effet, son parcours n'est pas touché.
- **Recruteur** : mêmes chiffres, mêmes blocs, même apparence — seulement plus rapide. Aucun score, rapport, matrice ou roue n'est modifié.
- **Données** : aucune donnée modifiée ; ajout d'une fonction de lecture et d'index uniquement.
- **Risque de casse** : faible. Point de vigilance : les chiffres du tableau de bord doivent être strictement identiques à ceux d'aujourd'hui — je les compare avant de basculer. En cas d'écart, l'ancien calcul reste en place.
- **Build** : pas de rupture attendue.

## Vérification

- Comparaison des chiffres ancien/nouveau calcul sur votre compte.
- Mesure du temps de chargement avant/après.
- Test E2E candidat puis recruteur (actuellement bloqués par le fichier de configuration manquant déjà connu) + contrôle direct du tableau de bord et d'une page poste.

## Détails techniques

- RPC `get_dashboard_summary(_user_id)` SECURITY INVOKER (RLS respectée), remplace `fetchDashboard` dans `useDashboardData.ts`.
- Hooks partagés `useProfile` / `useOrgRole` avec clés React Query uniques ; `ProtectedRoute`, `AppSidebar` s'y branchent.
- Pagination `.range()` + `count: 'exact'` dans la liste des sessions du poste.
- Index : `sessions(project_id, status, is_demo, created_at)`, `reports(generated_at)`, `reports(session_id)` si absents.
