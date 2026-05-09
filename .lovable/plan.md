## Objectif

Déplacer/intégrer la détection de navigateur incompatible dans la page **Vérification technique** (`InterviewDeviceTest`) sous forme d'un **onglet/carte « Navigateur compatible »** au même titre que Micro / Son / Transcription / Réseau, et logger le user-agent en BDD pour tracer les futurs cas comme Charlène.

---

## État actuel

`src/pages/InterviewDeviceTest.tsx` a déjà :
- une fonction `detectUnsupportedBrowser()` (lignes 81-102) qui détecte Instagram, Facebook, Snapchat, TikTok, LinkedIn, Line, Firefox iOS, et l'absence de `MediaRecorder` / `getUserMedia` / `AudioContext`.
- un **écran 100% bloquant** (lignes 556-584) qui s'affiche avant la liste des tests si le navigateur n'est pas supporté.

Limites actuelles :
- Patterns **incomplets** : pas de détection Outlook Mobile, Teams, Gmail in-app, WhatsApp, WeChat, ni du flag générique `wv` (Android WebView).
- La détection est **binaire et bloquante** : elle court-circuite tous les autres tests, peu cohérent avec l'UI multi-cartes.
- Aucune **trace en BDD** : impossible a posteriori de savoir avec quel navigateur un candidat a échoué.

---

## 1. Nouvelle carte « Navigateur compatible »

### Intégration UI
Ajouter une 5e `<TestCard>` **en première position** dans la liste des tests (avant Micro), avec :
- icône `Globe` (lucide)
- titre « Navigateur »
- `status`: `ok` si compatible, `warning` si compatible mais à risque (ex. Edge ancien), `error` si bloquant
- en cas d'`error` : message expliquant le problème + bouton « Copier le lien » + lien « Continuer quand même » (même UX que l'écran bloquant actuel, mais inline dans la carte).
- en cas d'`ok` : ligne « Chrome 131 sur macOS » + check vert.

Mise à jour du compteur de progression : `progressTests` passe de 4 à 5 éléments (`browser, mic, sound, stt, network`).

### Suppression de l'écran 100% bloquant
On garde le contenu mais on l'**inline** dans la carte. Le candidat voit toujours les autres tests grisés / non démarrés. Cela évite de cacher le contexte et harmonise l'UX.

Exception : si `error` avec `kind: 'fatal'` (pas de `getUserMedia` du tout), on désactive automatiquement le démarrage des autres cartes mic/cam (déjà géré naturellement puisque les tests échoueront).

### Détection enrichie
Nouveau module `src/lib/browserCompat.ts` qui remplace `detectUnsupportedBrowser` :

```ts
export type CompatLevel = 'ok' | 'warning' | 'blocked';
export interface BrowserCompatResult {
  level: CompatLevel;
  reason?: string;
  // Détails parsés pour log + affichage
  browser: string;       // "Chrome", "Safari", "Outlook Mobile WebView"
  browserVersion?: string;
  os: string;            // "iOS 17", "Windows 11", "Android 14"
  isInAppWebview: boolean;
  webviewHost?: string;  // "Outlook", "Teams", "Gmail", ...
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  userAgent: string;
}
```

Patterns ajoutés (level=`blocked`) :
- Outlook Mobile : `OutlookMobile`, `Outlook-iOS`, `Outlook-Android`
- Microsoft Teams : `Teams/`, `MSTeams`
- Gmail in-app : `GSA/` sur iOS sans Safari, `GoogleApp`
- WhatsApp : `WhatsApp`
- WeChat : `MicroMessenger`
- Android WebView générique : `; wv\)` dans l'UA
- Existants conservés : Instagram, Facebook (`FBAN/FBAV/FB_IAB`), Snapchat, TikTok, LinkedIn, Line, Firefox iOS

Patterns `warning` (compatible mais connu pour bugs intermittents) :
- Edge < 110, Firefox < 100, Safari < 14

### Hors scope
- Pas de modif de `InterviewLanding` : la détection reste sur la page de vérif technique, conformément à la demande.

---

## 2. Log du user-agent en BDD

### Nouvelle table `session_attempts`

Tracer **chaque arrivée** sur la vérif technique, qu'elle aboutisse ou non.

Colonnes :
- `id`, `created_at`
- `session_id` (FK logique vers `sessions.id`, **non nullable** : on a toujours une session à ce stade puisque créée sur InterviewLanding)
- `user_agent` (text)
- `browser`, `browser_version`, `os` (text)
- `is_in_app_webview` (bool), `webview_host` (text nullable)
- `compat_level` (`ok` | `warning` | `blocked`)
- `block_reason` (text nullable)
- `has_get_user_media`, `has_media_recorder`, `has_audio_context` (bool)
- `screen_w`, `screen_h`, `viewport_w`, `viewport_h` (int)
- `language` (text)
- `proceeded_anyway` (bool, default false) — true si l'utilisateur a cliqué « Continuer quand même » malgré un blocage

### RLS
- `INSERT` ouvert à `anon` (cohérent avec les autres tables candidat comme `sessions`, `session_messages`).
- `SELECT` réservé aux membres de l'organisation propriétaire du projet via jointure `sessions → projects.organization_id`, + super admins.
- Pas d'`UPDATE` côté client sauf le toggle `proceeded_anyway` (autorisé en `anon` uniquement sur ce champ via RPC `mark_attempt_proceeded(attempt_id)` SECURITY DEFINER, pour rester propre).
- Pas de `DELETE`.

### Quand écrire
- **Au mount de `InterviewDeviceTest`** : un seul `INSERT` avec le résultat de `detectBrowserCompat()`.
- Si l'utilisateur clique « Continuer quand même » → appel RPC `mark_attempt_proceeded`.
- Échecs silencieux (try/catch) — le log ne doit jamais bloquer le candidat.

### Liaison côté `sessions`
Pas de modif de `sessions`. La jointure se fait via `session_attempts.session_id`.

---

## 3. Vue côté RH (P2 — hors scope)

À l'avenir : sur la page détail projet, afficher un compteur « X tentatives bloquées (navigateur incompatible) cette semaine » avec drill-down listant user-agents + emails candidats. Permet d'identifier les candidats à recontacter (cas Charlène).

---

## Fichiers

### Créés
- `src/lib/browserCompat.ts` — détection enrichie + parsing UA + retour structuré
- Migration SQL : table `session_attempts`, RLS, RPC `mark_attempt_proceeded`

### Modifiés
- `src/pages/InterviewDeviceTest.tsx` :
  - Remplace `detectUnsupportedBrowser` par `detectBrowserCompat` du nouveau module.
  - Au mount : `INSERT session_attempts` (silencieux).
  - Ajoute une `<TestCard>` « Navigateur » en première position.
  - Supprime l'écran 100% bloquant (lignes 556-584) au profit du rendu inline dans la carte.
  - Ajoute `browser` à `progressTests`.
  - Sur clic « Continuer quand même » → appel RPC.

### Hors scope (confirmé)
- `InterviewLanding.tsx` : aucune modif.
- Tableau de bord RH des tentatives bloquées.
- Tests sur navigateurs réels via BrowserStack.

---

## Validation

1. Simuler un UA Outlook Mobile (DevTools → Network → Custom UA) : la carte « Navigateur » apparaît en rouge avec message ciblé, les autres cartes restent grises.
2. Vérifier qu'une ligne `session_attempts` existe avec `compat_level='blocked'` et `webview_host='Outlook'`.
3. Cliquer « Continuer quand même » : le flux normal reprend, et `proceeded_anyway` passe à `true` en BDD.
4. Sur Chrome desktop : carte « Navigateur » verte « Chrome 131 sur macOS — compatible », ligne BDD avec `compat_level='ok'`.