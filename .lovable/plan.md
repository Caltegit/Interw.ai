# Refonte des 3 tarifs de la landing

## Objectif

Remplacer les 3 cartes tarifaires actuelles par une grille plus claire et engageante, alignée sur la stratégie « gratuit à l'usage / mensuel / sur mesure ».

## Modification

Section `#pricing` dans `src/pages/Landing.tsx` (lignes 345-419). Seuls le sous-titre et le contenu des 3 cartes changent. La structure visuelle (cards, highlight, CTA) reste identique pour préserver la cohérence du design.

### Sous-titre
Remplacer *« Sans engagement. Tarification transparente sur devis selon le nombre d'entretiens. »* par :
> *« Sans engagement. Payez uniquement ce que vous utilisez, ou passez en illimité. »*

### Carte 1 — Gratuit à l'usage
- **Nom** : Pay as you go
- **Prix** : 2 € / entretien
- **Description** : Idéal pour démarrer ou pour les recrutements ponctuels.
- **Features** :
  - Inscription gratuite, aucun abonnement
  - Projets illimités
  - Rapports IA détaillés
  - Facturation à l'entretien terminé
- **CTA** : Commencer gratuitement
- **Highlight** : non

### Carte 2 — Mensuel (mise en avant)
- **Nom** : Pro
- **Prix** : 49 € / mois
- **Description** : Pour les recruteurs qui interviewent chaque semaine.
- **Features** :
  - Entretiens illimités
  - Bibliothèque de questions et critères partagée
  - Modèles d'entretien réutilisables
  - Support prioritaire
- **CTA** : Démarrer l'essai
- **Highlight** : oui (badge « Le plus choisi »)

### Carte 3 — Sur mesure
- **Nom** : Entreprise
- **Prix** : Sur mesure
- **Description** : Pour les organisations à fort volume ou aux exigences spécifiques.
- **Features** :
  - Volume négocié et tarif dégressif
  - SSO, rôles avancés, multi-équipes
  - Personnalisation IA et voix sur mesure
  - DPA, engagement RGPD, accompagnement dédié
- **CTA** : Nous contacter
- **Highlight** : non

## Notes

- Le suffixe « / entretien » et « / mois » sera affiché en plus petit à côté du prix pour rester lisible.
- Tous les CTA conservent le comportement actuel : ouverture du `DemoRequestDialog` via `openDemo()`.
- Aucune logique de paiement réelle n'est branchée — c'est un affichage marketing. Si tu veux brancher Stripe pour facturer réellement, c'est un chantier séparé à planifier après.

## Hors scope

- Mise en place réelle de la facturation (Stripe / Paddle)
- Limitation technique du nombre d'entretiens selon la formule
- Page de comparaison détaillée des plans