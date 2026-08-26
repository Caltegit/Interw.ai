# Lot i18n A — Détection de langue et infrastructure

Mise en place de la tuyauterie i18n uniquement. Aucune extraction de chaîne, sauf une chaîne témoin pour prouver le câblage.

## Périmètre

Inclus : installation de la librairie, détecteur de langue, provider, structure des fichiers de traduction, hook de changement de langue, une chaîne migrée.

Exclus (amendements validés) :
- `src/pages/InterviewDeviceTest.tsx:644` reste inchangé — `navigator.language` continue d'alimenter la télémétrie `session_attempts.language` avec le tag brut du navigateur.
- Les routes `/shared-report/:token`, `/highlights/:token`, `/p/:slugPublic`, `/o/:slug` ne sont pas câblées au détecteur (lot ultérieur).
- Pas de namespaces `admin` ni `superadmin` : ces écrans restent en français en dur.

## Ce qui est mis en place

1. Dépendances : `i18next`, `react-i18next`.
2. Langues : `fr` et `en`. **Langue par défaut et fallback : `en`.** Une locale résout en `fr` uniquement si son sous-tag primaire est `fr` (insensible à la casse) ; toute autre langue, connue ou non, donne `en`.
3. Ordre de résolution, premier trouvé gagne :
   1. query string `?lang=fr` / `?lang=en`
   2. `localStorage`, clé `interw_lang`
   3. `navigator.languages` (premier tag dont le sous-tag primaire est `fr` → `fr`, sinon `en`), avec `navigator.language` en secours
   4. `en`
4. Namespaces créés, vides hormis la chaîne témoin : `common`, `auth`, `dashboard`, `projects`, `sessions`, `candidate`, `projectWizard`, `resources`, `report`, `settings`, `landing`, `pricing`, `faq` (en FR et EN).
5. Provider monté au-dessus du routeur, sans changement de structure d'URL ni de route.
6. Mise à jour de l'attribut `lang` de `<html>` au changement de langue.
7. `LanguageSwitcher` compact (FR/EN) placé dans la navbar de la landing publique et dans le dropdown du bouton compte en bas de la sidebar produit. Le choix manuel écrase la détection et persiste dans `localStorage` (`interw_lang`).
8. Preuve de câblage : une seule chaîne réelle du namespace `common` migrée vers `t()`, avec ses versions FR et EN.

## Détails techniques

- Nouveaux fichiers : `src/i18n/index.ts` (init i18next), `src/i18n/detect.ts` (normalisation + détection), `src/i18n/locales/fr/*.json`, `src/i18n/locales/en/*.json`, `src/hooks/useLanguage.ts`, `src/components/LanguageSwitcher.tsx`.
- Fichiers modifiés : `package.json`, `src/main.tsx` (import de l'init), `src/App.tsx` (ajout du provider autour de `BrowserRouter`, aucune route touchée), `src/pages/Landing.tsx` (navbar), `src/components/AppSidebar.tsx` (dropdown compte), et le composant portant la chaîne témoin.
- Configuration i18next : `fallbackLng: "en"`, `supportedLngs: ["fr", "en"]`, `nonExplicitSupportedLngs: true`, `returnNull: false`, `interpolation.escapeValue: false`.
- Détection maison dans `detect.ts` (pas de `i18next-browser-languagedetector`) pour garantir la règle « fr sinon en » exactement.
- Ressources importées statiquement (bundle unique), pas de chargement HTTP asynchrone : évite tout flash de contenu non traduit.

## Vérification

Une fois le plan approuvé, j'exécuterai la table de cas suivante contre le code réel et je te rendrai les résultats obtenus, plus le contenu intégral de `src/i18n/detect.ts` :

`fr-FR`, `fr-BE`, `fr-CA`, `fr-CH`, `nl-BE`, `en-CA`, `en-US`, `zh-CN`, `es-ES`, `["nl-BE","fr-BE"]`.

Autres contrôles : `?lang=fr` gagne sur `localStorage` ; le switcher persiste le choix ; aucun changement d'URL, les liens de session candidat en circulation restent valides.

