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
2. Langues : `fr` et `en`. **Langue par défaut et fallback : `en`.** Une locale résout en `fr` uniquement si son sous-tag primaire est `fr` (insensible à la casse) ; toute autre langue, connue ou non, donne `en`.
3. Ordre de résolution géré par `i18next-browser-languagedetector` : `order: ['querystring', 'localStorage', 'navigator']`, `lookupQuerystring: 'lang'`, `lookupLocalStorage: 'interw_lang'`, `caches: ['localStorage']`. Le plugin renvoie des tags bruts (`zh-CN`, `nl-BE`) ; la normalisation « fr sinon en » est appliquée par-dessus via un détecteur personnalisé enregistré dans le `LanguageDetector`, qui enveloppe la valeur du plugin. Sans information exploitable : `en`.
4. Namespaces créés, vides hormis la chaîne témoin : `common`, `auth`, `dashboard`, `projects`, `sessions`, `candidate`, `projectWizard`, `resources`, `report`, `settings`, `landing`, `pricing`, `faq` (en FR et EN).
5. Provider monté au-dessus du routeur, sans changement de structure d'URL ni de route.
6. Mise à jour de l'attribut `lang` de `<html>` au changement de langue.
7. `LanguageSwitcher` compact (FR/EN) placé dans la navbar de la landing publique et dans le dropdown du bouton compte en bas de la sidebar produit. Le choix manuel écrase la détection et persiste dans `localStorage` (`interw_lang`).
8. Preuve de câblage : une seule chaîne réelle du namespace `common` migrée vers `t()`, avec ses versions FR et EN.

## Détails techniques

- Nouveaux fichiers : `src/i18n/index.ts` (init i18next), `src/i18n/detect.ts` (normalisation + détection), `src/i18n/locales/fr/*.json`, `src/i18n/locales/en/*.json`, `src/hooks/useLanguage.ts`, `src/components/LanguageSwitcher.tsx`.
- Fichiers modifiés : `package.json`, `src/main.tsx` (import de l'init), `src/App.tsx` (ajout du provider autour de `BrowserRouter`, aucune route touchée), `src/pages/Landing.tsx` (navbar), `src/components/AppSidebar.tsx` (dropdown compte), et le composant portant la chaîne témoin.
- Configuration i18next : `fallbackLng: "en"`, `supportedLngs: ["fr", "en"]`, `nonExplicitSupportedLngs: true`, `returnNull: false`, `interpolation.escapeValue: false`.
- `src/i18n/detect.ts` expose une fonction pure de normalisation (`normalizeLanguage(tags)`), testable isolément : premier tag dont le sous-tag primaire est `fr` (insensible à la casse) → `fr` ; tout le reste, connu ou inconnu → `en` ; rien d'exploitable → `en`. Elle est branchée sur `i18next-browser-languagedetector` via un détecteur personnalisé placé en tête de l'ordre, qui lit les sources du plugin (querystring, localStorage, navigator) puis normalise leur valeur brute.
- Ressources importées statiquement (bundle unique), pas de chargement HTTP asynchrone : évite tout flash de contenu non traduit.

## Vérification

Une fois le plan approuvé, j'exécuterai la table de cas suivante contre le code réel et je te rendrai les résultats obtenus, plus le contenu intégral de `src/i18n/detect.ts` et de `src/i18n/index.ts` :

`fr-FR`, `fr-BE`, `fr-CA`, `fr-CH`, `nl-BE`, `en-CA`, `en-US`, `zh-CN`, `es-ES`, `["nl-BE","fr-BE"]`.

Autres contrôles : `?lang=fr` gagne sur `localStorage` ; le switcher persiste le choix ; aucun changement d'URL, les liens de session candidat en circulation restent valides.


---

# Lot i18n B2 — Landing publique

État constaté : le Lot A n'est pas encore dans le code (`src/i18n/` absent). Seules les dépendances `i18next`, `react-i18next`, `i18next-browser-languagedetector` sont installées dans `package.json`. Le Lot A est donc livré d'abord, tel que décrit ci-dessus, puis le Lot B2 enchaîne.

## Périmètre

- `src/pages/Landing.tsx` (769 lignes) — navbar publique, hero, problème, produit, tarifs, FAQ, CTA final, footer.
- `src/pages/Produit.tsx` (288 lignes).
- `src/components/landing/FunnelCards.tsx` et `src/components/landing/DemoRequestDialog.tsx`, utilisés uniquement par ces deux pages.

Hors périmètre : produit authentifié, pages candidat, admin. Aucun composant partagé (`components/ui/*`) n'est modifié.

## Ce qui est fait

1. Extraction de toutes les chaînes visibles de ces fichiers vers les namespaces `landing`, `pricing`, `faq` (FR + EN), avec traduction anglaise rédigée, pas machine-brute.
2. Clés nommées par section : `landing:nav.*`, `landing:hero.*`, `landing:problem.*`, `landing:product.*`, `landing:cta.*`, `landing:footer.*`, `pricing:*`, `faq:*`.
3. Les listes (cartes, items de FAQ, lignes de tarifs) passent par des tableaux de clés, pas par `returnObjects`, pour rester typables.
4. Le `LanguageSwitcher` du Lot A reste dans la navbar publique ; aucune autre modification de mise en page ni de style.
5. Les données non textuelles (liens Cal.com, images, ancres `#tarifs`) restent inchangées — aucune modification d'URL.

## Vérification

- Navigateur `fr-*` : la landing et `/produit` sont identiques à aujourd'hui, mot pour mot.
- `?lang=en` : toutes les sections s'affichent en anglais, aucune chaîne française résiduelle.
- Bascule via le switcher : rendu immédiat, choix persisté, `<html lang>` mis à jour.
