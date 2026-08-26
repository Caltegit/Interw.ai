# Lot i18n A — Détection de langue et infrastructure

Mise en place de la tuyauterie i18n uniquement. Aucune extraction de chaîne, sauf une chaîne témoin pour prouver le câblage.

## Périmètre

Inclus : installation de la librairie, détecteur de langue, provider, structure des fichiers de traduction, hook de changement de langue, une chaîne migrée.

Exclus (amendements validés) :
- `src/pages/InterviewDeviceTest.tsx:644` reste inchangé — `navigator.language` continue d'alimenter la télémétrie `session_attempts.language` avec le tag brut du navigateur.
- Les routes `/shared-report/:token`, `/highlights/:token`, `/p/:slugPublic`, `/o/:slug` ne sont pas câblées au détecteur (lot ultérieur).
- Pas de namespaces `admin` ni `superadmin` : ces écrans restent en français en dur.

## Ce qui est mis en place

1. Dépendances : `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
2. Langues : `fr` (par défaut et fallback) et `en`. Détection dans l'ordre : préférence stockée (`localStorage`, clé `interw.lang`) puis langue du navigateur, sinon `fr`. Normalisation `fr-FR` → `fr`, `en-GB` → `en` ; toute autre langue retombe sur `fr`.
3. Namespaces créés, vides hormis la chaîne témoin : `common`, `auth`, `dashboard`, `projects`, `sessions`, `candidate`, `projectWizard`, `resources`, `report`, `settings`.
4. Provider monté au-dessus du routeur, sans changement de structure d'URL ni de route.
5. Mise à jour de l'attribut `lang` de `<html>` au changement de langue.
6. Hook simple de lecture/écriture de la langue courante, prêt pour un futur sélecteur (aucun sélecteur ajouté dans ce lot).
7. Preuve de câblage : une seule chaîne réelle du namespace `common` migrée vers `t()`, avec ses versions FR et EN.

## Détails techniques

- Nouveaux fichiers : `src/i18n/index.ts` (init i18next), `src/i18n/detect.ts` (normalisation + détection), `src/i18n/locales/fr/*.json`, `src/i18n/locales/en/*.json`, `src/hooks/useLanguage.ts`.
- Fichiers modifiés : `package.json`, `src/main.tsx` (import de l'init), `src/App.tsx` (ajout du provider autour de `BrowserRouter`, aucune route touchée), et le composant portant la chaîne témoin.
- Ressources importées statiquement (bundle unique), pas de chargement HTTP asynchrone : évite tout flash de contenu non traduit.
- `returnNull: false`, `fallbackLng: "fr"`, `interpolation.escapeValue: false` (React échappe déjà).

## Vérification

- L'application démarre en français à l'identique pour un navigateur `fr-FR`.
- Avec un navigateur `en-US`, la chaîne témoin s'affiche en anglais, tout le reste reste en français (attendu à ce stade).
- Aucun changement d'URL ; les liens de session candidat en circulation restent valides.
