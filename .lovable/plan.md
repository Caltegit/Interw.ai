# Correctifs écran "Candidats à repasser"

## 1. Zéro candidat affiché — GRANT manquant sur la RPC

**Cause** : `public.admin_list_impacted_candidates()` existe et renvoie bien 23 lignes en SQL direct, mais elle n'a **aucun `GRANT EXECUTE`**. Depuis le client (rôle `authenticated`), PostgREST refuse l'appel, `supabase.rpc(...)` retourne `null`, la page affiche "Aucun candidat".

**Fix** : migration ajoutant

```sql
REVOKE ALL ON FUNCTION public.admin_list_impacted_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_impacted_candidates() TO authenticated;
```

La fonction est déjà `SECURITY DEFINER` avec check `has_role(auth.uid(),'super_admin')` en interne, donc seul un super-admin verra les données même avec le GRANT à `authenticated`.

## 2. Lien CTA de l'e-mail candidat — forcer le domaine production

**Cause** : dans `supabase/functions/resend-impacted-candidate/index.ts` (ligne ~127) le lien est bâti depuis `req.headers.origin`, qui renvoie l'URL preview `id-preview--….lovableproject.com` quand on teste depuis Lovable. L'e-mail visible sur ton screenshot 2 contient effectivement ce domaine.

**Fix** : ignorer complètement `origin`/`referer` et utiliser **toujours** le domaine public du produit :

```ts
// Domaine public fixe — jamais l'origine de la requête (preview Lovable).
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "https://interw.ai";
const ctaLink = `${PUBLIC_APP_URL}/session/${project.slug}/start/${newSession.token}`;
```

L'e-mail contiendra alors `https://interw.ai/session/…` quel que soit l'endroit d'où l'admin déclenche l'envoi (preview ou prod).

## 3. Bouton "Ouvrir" témoin bloqué en preview — comportement attendu

**Cause** : `AdminCandidatesToRecover.tsx` utilise `window.location.origin` pour le bouton "Ouvrir" et "Copier". En preview c'est `id-preview--….lovableproject.com`, qui n'accepte de trafic que dans l'iframe Lovable → `ERR_BLOCKED_BY_RESPONSE` dans un autre navigateur.

**Ce n'est pas un bug fonctionnel** : une fois publié, `window.location.origin` = `https://interw.ai` et tout fonctionne.

**Amélioration UX pour lever l'ambiguïté pendant les tests** : dans le composant, aligner la construction du lien "témoin" sur le même domaine que celui utilisé dans l'e-mail — c-à-d **toujours** `https://interw.ai/…` — ainsi le lien copié/ouvert par l'admin est le lien réel que recevra le candidat.

```ts
const PUBLIC_APP_URL = "https://interw.ai";
function candidateUrl(slug: string, token: string) {
  return `${PUBLIC_APP_URL}/session/${slug}/start/${token}`;
}
```

Petite note visuelle sous la zone témoins :
> Les liens pointent vers `interw.ai` (domaine réel envoyé aux candidats).

## Fichiers touchés

- **Nouvelle migration** : `GRANT EXECUTE` sur `admin_list_impacted_candidates`.
- **`supabase/functions/resend-impacted-candidate/index.ts`** : remplacer la dérivation `origin/referer` par `PUBLIC_APP_URL` constant.
- **`src/pages/AdminCandidatesToRecover.tsx`** : `candidateUrl()` utilise `https://interw.ai` + mini-note explicative.

## Hors périmètre

- Pas de changement de logique métier (filtre 8→16 juillet, garde super-admin, anti-doublon inchangés).
- Pas d'envoi automatique ; tout reste manuel via l'écran.
- Pas de nouveau secret : `PUBLIC_APP_URL` a un fallback en dur `https://interw.ai`.
