## Objectif

Ajouter un 4ᵉ onglet **« Big Five »** dans le rapport (`SessionDetail` + `SharedReport`), avec un petit pictogramme rond affichant le score Big Five moyen sur 10. Déplacer dans cet onglet le contenu actuellement en bas de l'onglet « Reco IA » (`DeepAnalysisAccordion` = PersonalityRadar + SoftSkills).

## Calcul du score Big Five /10

Moyenne des 5 traits (`openness`, `conscientiousness`, `extraversion`, `agreeableness`, `emotional_stability`) qui ont un score, divisée par 10. Borné 0-10, arrondi à 1 décimale. Si aucun trait disponible → onglet quand même cliquable mais pictogramme remplacé par « — ».

## Implémentation

1. **Nouveau composant** `src/components/session/BigFiveBadge.tsx` :
   - Petit cercle 22×22 avec le chiffre /10 au centre
   - Couleur selon valeur (success ≥ 6.5, warning ≥ 4.5, sinon destructive) — réutilise les tokens existants
   - Helper exporté `computeBigFiveAverage(profile) → number | null`

2. **`SessionDetail.tsx`** :
   - `TabsList` passe de `grid-cols-3` à `grid-cols-4`
   - Ajouter `<TabsTrigger value="bigfive">` avec icône `Brain` + `BigFiveBadge`
   - Retirer `<DeepAnalysisAccordion>` de l'onglet `decision`
   - Nouveau `<TabsContent value="bigfive">` qui rend `<PersonalityRadar>` + `<SoftSkillsCard>` directement (pas en accordéon, c'est l'onglet)

3. **`SharedReport.tsx`** : mêmes modifs.

4. Le composant `DeepAnalysisAccordion` n'est plus utilisé → on peut le laisser pour l'instant (pas critique de supprimer).

## Hors scope

- Pas de changement DB
- Pas de refonte du PersonalityRadar (juste réutilisé tel quel)