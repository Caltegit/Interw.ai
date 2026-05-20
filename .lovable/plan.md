# Régénération + affichage des rapports en cours / à refaire

## 1) Régénérations lancées ✅

J'ai lancé `finalize-session` pour les **7 sessions orphelines** du projet Domaine Chapelle qui ont du contenu exploitable (≥15 messages) :

| Candidat | Session |
|---|---|
| **Anne CLERF** | `bdc211fc…` |
| Estelle Bergmann | `cdfb9ff8…` |
| Larry Sultan | `308b619b…` |
| Laure Marchand | `b7148ca8…` |
| D'emilia | `ce701c57…` |
| Houssem | `b3d88c57…` |
| Aurélie Prudhomme | `22508aaa…` |

Toutes ont répondu `202 processing`. La transcription + génération tourne en arrière-plan (~2-5 min).

**4 sessions ignorées** : Myriam Naud, Michael ROYER, Edouard Petard, Messara — n'ont **qu'1 seul message** côté base (entretien démarré puis abandonné, aucun contenu à analyser). Inutile de régénérer.

## 2) Vérification (étape 3 de ta demande)

Après ~5 minutes, je requêterai la table `reports` pour confirmer la création des 7 lignes. Si certaines échouent, je consulterai les logs `generate-report` pour comprendre.

## 3) Afficher les sessions « rapport en cours / à refaire »

### Comportement actuel
Dans `ProjectDetail.tsx`, la liste filtre via `isReady = status === "completed" && hasReport`. Les sessions complétées sans rapport sont **complètement invisibles** (même `processingCount` est calculé mais jamais affiché).

### Changement proposé
Ajouter un **bandeau compact** au-dessus des chips de sélection (avant ligne 697) qui liste les sessions complétées sans rapport, avec deux états :

- **« En cours »** (terminée il y a < 10 min) — pastille bleue, pas d'action
- **« À refaire »** (terminée il y a ≥ 10 min, sans rapport) — pastille orange + bouton **« Régénérer »** par ligne

Le bandeau est un `<Popover>` repliable :
```
⚙ 3 entretien(s) en traitement   [Voir]
```
Au clic, liste compacte :
```
• Anne CLERF       À refaire       [Régénérer]
• Estelle Bergmann  En cours…
…
```

### Détails techniques

- Nouveau state `regenerating: Set<string>` + handler `regenerateReport(sessionId)` qui appelle `supabase.functions.invoke("finalize-session", { body: { session_id } })`.
- Toast de confirmation, refetch automatique après 30 s.
- Sessions à 1 seul message exclues du bandeau (impossible à régénérer utilement).
- Aucun changement DB ni RLS.

### Fichier modifié
- `src/pages/ProjectDetail.tsx` — ajout du state, du handler et du bandeau (~50 lignes).

## Hors périmètre (à traiter après)

- **Bug de fond** : pourquoi `finalize-session` n'a-t-il pas généré le rapport lors de la complétion initiale ? À investiguer dans une étape suivante après avoir vérifié les logs des régénérations actuelles.

Passe-moi en mode build et j'applique l'étape 3, puis je vérifie l'étape 2 dans la foulée.
