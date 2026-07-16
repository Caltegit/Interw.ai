
# Vérification E2E — Récupération candidats impactés

Boîte témoin confirmée : **eva@alboteam.com**. Aucun push tant que les 6 étapes ne sont pas vertes.

## 1. Contrôle exhaustivité de la liste (lecture seule)

Trois ensembles comparés via SQL :
- **A** = sessions candidat créées entre le 8 et le 16 juillet 2026, hors `is_demo`, avec au moins un `session_message` de rôle `candidate`.
- **B** = sous-ensemble de A sans aucun fichier > 1 Ko sous `interviews/<session_id>/` dans le bucket `media` (= impactés attendus).
- **C** = ce que retourne `admin_list_impacted_candidates()`.

Attendu : **B == C**. Écart → on liste les IDs manquants/en trop et on corrige la fonction avant tout push.

Cas limites vérifiés explicitement :
- sessions déjà `cancelled` avant l'incident (ne doivent pas être proposées à tort)
- sessions avec uniquement des messages `assistant` (pas candidat → hors périmètre)
- sessions déjà réinvitées (doivent apparaître avec `reinvitation_id`, `email_status`, `new_session_id`, PAS être masquées)

## 2. Test E2E réel de `resend-impacted-candidate`

Test Deno `supabase/functions/resend-impacted-candidate/index.test.ts` exécuté via `supabase--test_edge_functions`. Tous les envois réels du scénario 6 vont uniquement vers **eva@alboteam.com**.

1. Appel non authentifié → 401
2. Authentifié non super-admin → 403
3. `original_session_id` inexistant → 404
4. Session avec fichier média > 1 Ko (mode non-témoin) → 409 « contient des fichiers média »
5. Session déjà réinvitée → 409 « déjà envoyée »
6. **Cas nominal témoin** (`is_witness: true`) sur une session dédiée créée par le test, avec `candidate_email = eva@alboteam.com` :
   - nouvelle session `pending` clonée
   - ancienne passée `cancelled`
   - e-mail réellement envoyé via `send-transactional-email` (message_id Resend récupéré)
   - trace `session_reinvitations` : `email_status='sent'`, `email_message_id` non null, `is_witness=true`
   - `cta_link` retourné commence par `https://interw.ai/session/…` — ne contient jamais `lovableproject`, `localhost` ou `lovable.app`

Nettoyage en fin de test : suppression de la session témoin et de sa trace `session_reinvitations`.

## 3. Vérification du rendu e-mail

Rendu HTML du template `candidate-recovery-invite` avec données réalistes (prenom Eva, poste, entreprise, `cta_link` `https://interw.ai/session/...`) sauvegardé sous `/mnt/documents/preview-recovery-email.html`. Contrôles automatiques :
- absence stricte de `localhost`, `lovable.app`, `lovableproject`
- présence du bouton + du lien texte complet
- sujet = « Nous vous invitons à repasser votre entretien »

## 4. Vérification du chemin candidat

Playwright headless ouvre le `cta_link` généré au scénario 6 sur `http://localhost:8080` (même token, même chemin `/session/<slug>/start/<token>`) :
- la landing candidat charge sans erreur console
- la session est bien `pending` en base
- pas d'écran « lien invalide / bloqué »
- captures dans `/tmp/browser/recovery/`

## 5. Vérification UI super-admin

Playwright authentifié en super-admin (via injection de session Supabase) sur `/admin/candidates-to-recover` :
- table chargée, pas de bandeau rouge
- nombre de lignes == count SQL de l'étape 1 (ensemble B)
- ligne de la session témoin apparaît comme « déjà envoyée » (bouton désactivé) après le scénario 6
- capture d'écran archivée

## 6. Rapport final

Récap ✅/❌ pour chaque étape, avec preuves : counts SQL, `message_id` Resend, chemins des captures, extraits HTML. Remis avant toute décision de push.

## Détails techniques

- Zéro modification de code applicatif ou de schéma dans ce plan — uniquement lecture SQL, tests Deno et Playwright.
- Boîte de réception réelle : eva@alboteam.com (unique destinataire du seul envoi réel, scénario 6).
- Si l'étape 1 révèle un écart B ≠ C, on stoppe et on propose un correctif ciblé avant de continuer.
