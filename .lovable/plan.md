# Constat actuel

Aujourd’hui, ce n’est **pas exactement** la méthode simple que tu décris.

Le fonctionnement actuel est **hybride** :
- au moment de générer le rapport, le serveur recalcule les `start_seconds` ;
- s’il existe des `transcript_segments`, il essaie d’abord de retrouver la citation dans ces segments et prend le début du segment ;
- sinon il fait un **fallback proportionnel** sur le texte complet du message ;
- ce fallback utilise bien l’idée **position du premier mot / nombre total de mots**, mais avec une durée parfois **estimée** et non une vraie durée de clip ;
- en plus, certains composants du rapport n’envoient pas toujours l’horodatage au lecteur, ce qui crée des comportements incohérents selon la carte ou le bouton cliqué.

En clair : **ta logique simple existe en partie, mais elle n’est pas la seule source de vérité aujourd’hui**. C’est probablement pour ça que le bug revient.

# Plan proposé

## 1. Revenir à une seule règle de calcul, simple et déterministe
Je remplace la logique actuelle par **une seule méthode** pour tous les boutons “Voir le moment” :
- on normalise la transcription du message ;
- on normalise la citation ;
- on retrouve le début de la citation dans le texte ;
- on calcule `position_du_premier_mot / nombre_total_de_mots` ;
- on convertit ce pourcentage en secondes avec la **durée réelle du clip** ;
- on borne le résultat entre `0` et `durée du clip`.

Objectif : **plus de branche spéciale, plus de comportement variable selon les cas**.

## 2. Utiliser une vraie durée de clip
Le point faible actuel, c’est qu’on estime parfois la durée.

Je propose de :
- stocker une `clip_duration_seconds` par message candidat ;
- la renseigner au moment de la transcription / traitement média ;
- prévoir un rattrapage pour les anciens messages.

Comme ça, la formule reste simple **et** fiable.

## 3. Ne plus dépendre des timestamps fournis par l’IA
L’IA peut continuer à fournir citation + `message_id`, mais **le timestamp final doit être 100 % calculé côté serveur**.

Je vais donc :
- garder `message_id` et la citation comme source ;
- recalculer systématiquement `start_seconds` côté serveur ;
- uniformiser ce recalcul pour toutes les zones du rapport.

## 4. Uniformiser tous les objets de preuve du rapport
Aujourd’hui, les structures ne sont pas totalement homogènes (`message_id`, `evidence_message_id`, `start_seconds`, `evidence_start_seconds`, etc.).

Je vais :
- passer en revue toutes les cartes du rapport ;
- vérifier que chaque bouton “Voir le moment” reçoit bien le bon `messageId` **et** le bon `startSeconds` ;
- corriger les cartes qui n’envoient aujourd’hui que le `messageId` sans l’horodatage.

## 5. Mieux gérer les cas non retrouvables
Si une citation n’est pas retrouvée proprement :
- on ne fera plus un saut hasardeux ;
- soit on masque le bouton ;
- soit on le laisse, mais avec un comportement clair : ouverture du clip au début uniquement si on l’assume explicitement.

Je recommande : **pas de faux saut**. Si l’horodatage n’est pas fiable, mieux vaut ne pas afficher “Voir le moment”.

## 6. Recalculer les rapports existants
Pour corriger le stock existant, je prévois un backfill :
- recalcul des timestamps des rapports déjà générés ;
- remise à jour des champs `start_seconds` / `evidence_start_seconds` ;
- possibilité de relancer le recalcul pour une session donnée.

## 7. Ajouter de vrais tests de non-régression
Comme le bug est revenu plusieurs fois, je veux verrouiller ça par des tests :
- tests unitaires sur l’algorithme de positionnement ;
- cas avec citation exacte, citation partielle, citation répétée, transcription bruitée ;
- test E2E : ouvrir un rapport, cliquer sur “Voir le moment”, vérifier que la bonne vidéo s’ouvre et que `currentTime` est bien > 0 quand un timestamp existe.

# Détails techniques

## Changements code
- Remplacer la logique de `resolve-start-seconds.ts` par un calcul proportionnel unique.
- Ajouter une vraie durée de clip sur les messages candidats.
- Faire recalculer tous les timestamps dans `generate-report` avec cette méthode unique.
- Harmoniser `backfill-report-timestamps` avec exactement la même logique.
- Corriger les composants du rapport qui n’envoient pas toujours `startSeconds` au lecteur.

## Points à vérifier en priorité
- `generate-report`
- `backfill-report-timestamps`
- `resolve-start-seconds.ts`
- `SessionVideoNavigator`
- cartes de rapport : soft skills, signaux, communication, personnalité, paraverbal, non-verbal

# Résultat attendu

Après cette refonte :
- un bouton “Voir le moment” utilisera **toujours la même règle** ;
- le calcul sera compréhensible et auditables ;
- on éliminera les faux positifs dus aux heuristiques mixtes ;
- les anciens rapports pourront être remis d’équerre.

# Ordre d’implémentation

1. Simplifier l’algorithme et définir la source de vérité.
2. Ajouter/récupérer la durée réelle des clips.
3. Uniformiser tous les appels UI.
4. Backfill des rapports existants.
5. Ajouter tests unitaires + E2E.

Si tu valides, j’implémente cette version simple et robuste, alignée sur la logique que tu avais définie.