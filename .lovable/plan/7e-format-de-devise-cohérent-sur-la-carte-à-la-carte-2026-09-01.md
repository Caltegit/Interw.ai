# 7e — Format de devise cohérent sur la carte "À la carte"

Sur la carte "À la carte" / "Pay as you go", la valeur "5 €" est codée en dur dans `src/pages/Landing.tsx`. En anglais cela affiche le symbole après le chiffre, alors que toutes les autres valeurs monétaires de la page affichent le symbole avant (€199, €4, €3).

## Modifications

1. **Créer une clé i18n dédiée** dans `src/i18n/locales/fr/pricing.json` et `src/i18n/locales/en/pricing.json` :
   - `values.perInterviewFlat5`
   - fr : `"5 €"`
   - en : `"€5"`

2. **Remplacer la valeur codée en dur** dans `src/pages/Landing.tsx`, configuration du plan `free` :
   - Avant : `{ labelKey: "specs.pricePerInterview", value: "5 €" }`
   - Après : `{ labelKey: "specs.pricePerInterview", valueKey: "values.perInterviewFlat5" }`

3. **Ne modifier aucun montant** : les tarifs 5 € / 4 € / 3 € restent identiques. Aucun autre plan, prix ou texte n'est touché.

## Vérification

- Affichage FR : la carte "À la carte" affiche toujours "5 €".
- Affichage EN : la carte "Pay as you go" affiche désormais "€5", aligné avec les autres montants de la page.
- Typecheck OK.
