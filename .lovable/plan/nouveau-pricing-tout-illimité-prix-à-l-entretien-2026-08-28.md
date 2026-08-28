# Nouveau pricing : tout illimité, prix à l'entretien

## Le principe

L'outil est en bêta. On arrête de segmenter par fonctionnalité : tout le monde a
tout. La seule variable est le nombre d'entretiens analysés. Objectif : provoquer
l'usage, pas faire monter en gamme.

Conséquence directe : le grand tableau comparatif disparaît entièrement. Chaque
cartouche ne porte plus que le prix, le volume inclus et le prix au-delà.

## Les quatre offres

| Offre | Prix | Entretiens inclus | Au-delà |
|---|---|---|---|
| À la carte | 0 € | — | 5 € / entretien |
| Plus | 199 € / mois | 100 | 4 € / entretien |
| Pro (populaire) | 399 € / mois | 300 | 3 € / entretien |
| Entreprise | Sur devis | Illimité | Négocié |

« Postes actifs simultanés » reste affiché sur chaque carte, mais avec la valeur
**Illimités** partout — c'est un argument, pas une limite. Idem pour les
utilisateurs : illimités partout.

Entreprise redevient une **quatrième cartouche à part entière** (la ligne unique
actuelle disparaît), avec « Sur devis » en prix et le bouton « Parler à l'équipe »
vers le calendrier.

## Crédits ou entretiens — ma réponse

On reste sur **entretiens**. Un crédit n'a de sens que quand plusieurs actions ont
des coûts différents (analyse simple, analyse longue, ré-analyse). Aujourd'hui
Interw ne facture qu'une chose : un candidat qui va au bout et dont le rapport est
généré. Introduire une monnaie intermédiaire ajouterait une conversion à expliquer
sans rien débloquer, alors que « 199 € pour 100 entretiens, puis 4 € » se comprend
en une seconde. Le jour où l'on facturera différemment un ré-scoring ou une analyse
vidéo longue, on basculera en crédits avec 1 crédit = 1 entretien : le passage sera
indolore. Les prix affichés étant ronds, rien à refaire côté copy.

## La bascule mensuel / annuel — recommandation CRO

Ta proposition est la bonne pratique standard (Attio, Linear, Notion le font tous) :
en annuel on affiche le **prix mensuel réduit**, pas la somme annuelle.

```text
Mensuel                    Annuel
399 €  / mois              332 €  / mois
Facturé chaque mois        399 € — Facturé 3 990 € par an
```

Trois éléments qui font la différence en conversion :
- le grand chiffre **baisse** quand on bascule, il ne saute pas à 3 990 €
- le chiffre tourne avec une micro-animation au moment du switch, comme un compteur.
- « Facturé annuellement » sous le prix annuel, pas le montant total.

Prix annuels : Plus 169 €/mois, Pro 329 €/mois. Le total annuel (2 028 € / 3 948 €)
n'est visible que dans le panier au moment de l'achat. L'offre À la carte et
Entreprise ne changent pas selon la bascule.

## Les 10 premiers entretiens offerts

Le bandeau au-dessus des cartes passe de l'essai 30 jours à une offre permanente :

> 10 entretiens offerts, sans carte bancaire — avec chaque forfait.

Affichage dans les cartouches :
- sous le prix, une ligne « 10 premiers entretiens inclus » ;
- le CTA principal devient « Commencer gratuitement » ;
- la mention « sans carte bancaire » reste sous le bouton pour rassurer.

Mécanique commerciale après les 10 gratuits :
- dès le 11e entretien généré, bannière in-app : « Votre 11e entretien est arrivé.
  Ajoutez un moyen de paiement pour continuer. » ;
- même message aux 12e et 13e entretiens ;
- au-delà, blocage doux : consultation autorisée, mais plus de nouveaux rapports
  générés tant qu'aucune carte n'est enregistrée.

## La FAQ suit

Trois réponses deviennent fausses avec ce changement et sont réécrites :
- « Qu'est-ce qu'un poste actif ? » → devient sans objet, on la supprime
- « Que se passe-t-il quand j'atteins mon quota ? » → plus de file d'attente ni de
  blocage : les entretiens supplémentaires sont simplement facturés au prix de
  l'offre (5 / 4 / 3 €)
- « Comment fonctionne l'essai ? » → aligné sur le bandeau
- « Mensuel ou annuel ? » → reformulé avec les nouveaux montants

## Vérification

- Bascule mensuel/annuel : le grand prix doit baisser, jamais augmenter
- Les quatre cartes doivent avoir la même hauteur, y compris Entreprise
- Aucune trace du comparatif ni de « postes actifs limités » sur la page
- Version anglaise cohérente au mot près

## Détails techniques

- `src/pages/Landing.tsx` : réécriture de `PLAN_KEYS` (4 offres, prix mensuel
  équivalent en annuel, specs réduites à 3 lignes), suppression de
  `COMPARISON_KEYS`, du bloc `Accordion` comparatif et de ses deux rendus
  desktop/mobile, suppression de la ligne Entreprise, ajout du bandeau d'essai,
  retrait de `activeRole` de `FAQ_KEYS`.
- `src/i18n/locales/fr/pricing.json` et `en/pricing.json` : nouvelles clés de
  plans et de valeurs, suppression de tout le bloc `compare` et de
  `enterpriseLine`.
- `src/i18n/locales/fr/faq.json` et `en/faq.json` : suppression de `activeRole`,
  réécriture de `quota`, `trial`, `billing`.
- Aucun changement de logique de facturation en base : la page tarifs est
  purement éditoriale à ce stade.
