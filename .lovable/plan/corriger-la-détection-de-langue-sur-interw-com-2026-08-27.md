# Corriger la détection de langue sur interw.com

## Cause confirmée

Testé sur le site publié avec un navigateur configuré en anglais :

- Navigateur `en-US` seul → la page s'affiche bien en anglais.
- Navigateur `en-US` avec le français en langue secondaire (`['en-US','en','fr-FR','fr']`, cas très courant sur un poste français dont le navigateur est passé en anglais) → la page s'affiche **en français**.

La règle actuelle parcourt **toute** la liste des langues du navigateur et retourne « fr » dès qu'un tag français apparaît, même en dernière position. La langue principale demandée par l'utilisateur est donc ignorée.

Aggravant : ce mauvais choix est mémorisé dans le navigateur (`interw_lang = fr`). Tant que cette valeur reste, la page continuera de s'ouvrir en français même après correction.

## Correctif

1. `src/i18n/detect.ts` : la décision se prend sur **le premier tag exploitable** de la liste. Sous-tag primaire `fr` → français ; toute autre langue → anglais. Les tags suivants ne sont plus consultés.
2. Purge unique de la préférence mémorisée : les valeurs écrites par l'ancienne détection sont ignorées et remplacées par la nouvelle détection, via une clé de stockage versionnée (`interw_lang_v2`). Un choix fait volontairement au sélecteur FR/EN après le correctif reste, lui, respecté.
3. Aucun changement sur l'ordre des sources : `?lang=` gagne toujours sur la mémoire, qui gagne sur le navigateur.

## Vérification

Cas testés en navigateur réel contre le site :
- `['en-US','en','fr-FR','fr']` → anglais
- `['fr-FR','en-US']` → français
- `['nl-BE','fr-BE']` → français uniquement si le premier tag est français, donc → anglais
- `['zh-CN']`, `['es-ES']` → anglais
- `?lang=fr` sur un navigateur anglais → français, et le choix persiste
- Ancienne valeur `interw_lang = fr` présente + navigateur anglais → anglais
