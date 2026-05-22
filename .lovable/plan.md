# Modifications du Dashboard

## 1. Masquer l'encart « Crédits de sessions »
Dans `src/pages/Dashboard.tsx` (lignes 139–175), envelopper la `Card` dans `{false && (...)}` pour conserver le code et pouvoir le réactiver plus tard.

## 2. Nouvelle section : deux colonnes

```text
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ 📁 3 derniers projets actifs │ │ 👥 5 dernières sessions      │
│                              │ │                              │
│  • Dev Senior        12 cand │ │  Marie Dupont   [RDV]   2h   │
│  • Product Manager    8 cand │ │  Paul Martin    [✓]    10min │
│  • Designer UX        5 cand │ │  Léa Bernard    [RDV]   1j   │
│                              │ │  Karim Saidi    [✓]     2j   │
│         Voir tous →          │ │  Sophie Klein   [—]     3j   │
└──────────────────────────────┘ └──────────────────────────────┘
```

### Colonne gauche — 3 derniers projets actifs
- Source : table `projects`, filtrés sur statut actif (non archivé), triés par `updated_at desc`, limité à 3
- Affichage par ligne : titre du projet + nombre de candidats/sessions
- Clic ligne → `/projects/:id`
- Lien « Voir tous les projets » → `/projects`
- État vide : « Aucun projet actif »

### Colonne droite — 5 dernières sessions candidats
- Source : `recentSessions` déjà fourni par `useDashboardData` (limiter à 5)
- Affichage par ligne : nom du candidat, statut (badge), date relative (« il y a 2h »)
- Clic ligne → `/sessions/:id` (uniquement si session complétée, sinon désactivé comme aujourd'hui)
- Lien « Voir tout » → `/projects` ou liste sessions
- État vide : « Aucune session pour le moment »

### Données à récupérer
- `recentSessions` : déjà disponible, OK.
- Liste des 3 derniers projets actifs avec compte de sessions : à ajouter dans `useDashboardData` (`src/hooks/queries/useDashboardData.ts`). Requête `projects` triée par `updated_at desc` avec `count` sur sessions.

## 3. Disposition globale après changement

```text
[ En-tête + citation + Nouveau projet ]

[ 3 derniers projets actifs ] [ 5 dernières sessions candidats ]

[ KPI : Projets | Attente | Complétés 30j | Score moyen ]

[ Alerte candidats inactifs si > 0 ]

[ Meilleurs candidats (30j) ] [ Recommandations (30j) ]

[ Tableau « Derniers sessions » existant — à conserver ou supprimer ? ]
```

> Question : le tableau « Derniers sessions » en bas devient redondant avec la nouvelle colonne droite. **Le supprime-t-on ou le garde-t-on ?**

## 4. Autres suggestions (non implémentées sans validation)

1. Mini-sparkline 30j dans la carte « Complétés (30j) »
2. Carte « Projet le plus performant » (meilleur score moyen)
3. Bouton « Reprendre » la dernière session consultée
4. Bandeau onboarding si aucun projet
5. Toggle « par recommandation / par projet » sur la répartition

## Détails techniques
- Fichiers modifiés : `src/pages/Dashboard.tsx` + `src/hooks/queries/useDashboardData.ts`
- Aucune migration DB
- Réutilise `SessionStatusBadge`, `Card`, `date-fns` pour les dates relatives
