

## Plan — Refonte du Dashboard

### Constat actuel

Le dashboard est sous-exploité :
- 3 KPI seulement (Projets, En attente, Complétés) — le score moyen est calculé mais jamais affiché
- Liste des 10 derniers entretiens sans contexte (pas de score, pas de recommandation)
- Aucun lien rapide pour les actions fréquentes (créer un projet, consulter la bibliothèque)
- Aucune vue d'ensemble du scoring (top candidats, distribution des recommandations)
- Aucune tendance temporelle

### Refonte proposée

**1. Bandeau d'accueil + actions rapides**

```
Bonjour [Prénom] 👋
[+ Nouveau projet]  [📋 Modèles d'entretien]  [❓ Bibliothèque questions]
```
- Salutation personnalisée (extrait `profile.full_name`)
- 3 boutons d'action rapide vers les pages les plus fréquentes

**2. KPI enrichis (4 cartes au lieu de 3)**

| Carte | Valeur | Détail secondaire |
|---|---|---|
| Projets actifs | 5 | +2 ce mois |
| Candidats en attente | 12 | dont 3 depuis +7j (alerte) |
| Entretiens complétés (30j) | 28 | +15 % vs période précédente |
| Score moyen (30j) | 72 % | barre de progression colorée |

Le score moyen utilise déjà `ScoreCircle` — réutilisation possible en mini-format.

**3. Section « Top candidats récents » (nouvelle)**

Carte affichant les 5 candidats avec le meilleur score sur les 30 derniers jours :
- Nom + projet
- `ScoreCircle` mini (size 48)
- `RecommendationBadge` (Favorable / À considérer / Non recommandé)
- Clic → page session

**4. Section « Distribution des recommandations » (nouvelle)**

Mini-graphique horizontal en barres empilées :
```
Favorable      ████████████ 12
À considérer   ██████ 6
Non recommandé ███ 3
```
Calculé sur les `reports.recommendation` des 30 derniers jours. Clic sur une barre → filtre la liste des entretiens.

**5. Liste « Derniers entretiens » enrichie**

Ajout de 2 colonnes au tableau existant :
- **Score** : badge coloré (vert ≥65, orange 45-64, rouge <45) ou `—` si non encore noté
- **Reco** : `RecommendationBadge` compact

Ordre des colonnes : Candidat / Projet / Statut / **Score** / **Reco** / Date / Actions

Suppression du bouton « Voir » texte → ligne entière cliquable pour les sessions complétées (cohérence avec la refonte du Détail Projet).

**6. Alerte candidats inactifs (conditionnelle)**

Si des candidats sont en attente depuis +7 jours :
```
⚠ 3 candidats n'ont pas démarré leur entretien depuis plus de 7 jours
   [Relancer tous] [Voir la liste]
```

### Architecture visuelle

```text
Bonjour Camille                                                        
[+ Nouveau projet]  [📋 Modèles]  [❓ Bibliothèque]                    

┌─────────────┬──────────────┬──────────────┬──────────────┐           
│ Projets: 5  │ Attente: 12  │ Complétés:28 │ Score: 72%   │           
│ +2 ce mois  │ ⚠ 3 >7j      │ +15% vs avt  │ ▓▓▓▓▓▓▓░░░   │           
└─────────────┴──────────────┴──────────────┴──────────────┘           

⚠ 3 candidats inactifs depuis +7j — [Relancer] [Voir]                  

┌──────────────────────────────┬──────────────────────────────┐        
│ 🏆 Top candidats (30j)        │ 📊 Recommandations           │        
│ Marie Dupont   [85%] Favor.   │ Favorable      ████████ 12   │        
│ Paul Martin    [78%] Favor.   │ À considérer   ████ 6        │        
│ Léa Chen       [74%] Consid.  │ Non recommandé ██ 3          │        
└──────────────────────────────┴──────────────────────────────┘        

Derniers entretiens                                                    
┌───────────┬────────┬────────┬──────┬──────┬────────┬─────┐           
│ Candidat  │ Projet │ Statut │ Score│ Reco │ Date   │ Act │           
└───────────┴────────┴────────┴──────┴──────┴────────┴─────┘           
```

### Modifications techniques

**Fichier modifié** : `src/pages/Dashboard.tsx` (seul fichier touché)

**Nouvelles requêtes** :
- `reports` filtré sur les 30 derniers jours pour le score moyen, le top candidats et la distribution des recommandations
- Calcul de la période précédente (30-60j) pour la variation en pourcentage
- Comptage des sessions `pending` avec `created_at < now() - 7 days`

**Composants réutilisés** : `ScoreCircle`, `RecommendationBadge`, `SessionStatusBadge`, `Card`, `Button`, `AlertDialog` (déjà importés ou existants)

**Nouvelle icône** : `TrendingUp`, `Trophy`, `BarChart3`, `Sparkles` (déjà dans lucide)

### Hors scope

- Pas de graphique avancé (pas d'ajout de Recharts pour cette itération — barres CSS simples suffisent)
- Pas de filtre temporel (30 jours figé pour l'instant)
- Pas de notification push ou email automatique pour les candidats inactifs
- Pas de modification de la sidebar ni des autres pages

