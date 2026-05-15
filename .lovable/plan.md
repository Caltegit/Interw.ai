# Pourquoi « Voir le moment » repart à zéro

## Diagnostic

J'ai inspecté la session `f41b9c1d…` directement en base. Deux problèmes se cumulent :

**1. Le rapport stocké ne contient AUCUN `start_seconds` dans `stats.fit_breakdown`.**
Chaque entrée a bien `message_id` et `quote`, mais la clé `start_seconds` est totalement absente. Conséquence : le composant `EvidenceLink` appelle `onGoToMessage(messageId, undefined)`, et `SessionVideoNavigator.playMessage` calcule donc `seek = max(0, 0 - margin) = 0`. La vidéo se positionne au début du clip, jamais à 1:05.

Ce rapport a été généré le 11/05 — avant que la logique `resolveStart` (lignes 866-914 de `generate-report/index.ts`) soit fiable. Tant qu'on ne régénère pas, le bouton ne pourra rien faire.

**2. Même après régénération, le calcul proportionnel actuel est fragile.**
Sur cette session, AUCUN message candidat n'a de `transcript_segments` (Whisper en mode "segments" n'a jamais tourné — colonne `null` partout). Du coup `resolveStart` retombe sur l'estimation `mots / 2.5` (~150 mots/min), puis fait `i / nbMots × durée`. Pour un message de 350 mots ça peut décaler de ±20 s. De plus :
- la recherche de la citation ne teste que les **3 premiers mots** (puis 2, puis 1) → si la citation IA paraphrase légèrement le début (cas fréquent), on ne tombe pas sur la bonne occurrence ;
- on cherche depuis le début → on prend la première occurrence du mot, pas forcément la bonne.

## Plan en 3 étapes

### Étape 1 — Rendre `resolveStart` robuste (`supabase/functions/generate-report/index.ts`)
- Quand `transcript_segments` existe sur le message : parcourir les segments, normaliser leur texte, et retourner le `start` du **premier segment qui contient au moins 3 mots consécutifs de la citation**. C'est précis à la seconde près sans dépendre d'une estimation.
- Sinon (fallback actuel) : améliorer le matching mots-à-mots :
  - chercher des fenêtres de 5 → 4 → 3 mots (plus discriminant) ;
  - parmi toutes les occurrences candidates, garder celle dont les **mots suivants** matchent le mieux la suite de la citation (score de chevauchement) ;
  - garder la formule `(i / words.length) × duration`, mais clamper la marge adaptative déjà appliquée côté client.

### Étape 2 — Backfill des rapports existants sans régénérer entièrement
- Ajouter dans `generate-report` (ou en petit endpoint dédié `backfill-report-timestamps`) une routine qui, si un rapport existe déjà, recharge ses `stats.fit_breakdown`, `decision_drivers`, `signals`, `red_flags`, `personality_profile.*.evidences`, `soft_skills`, `communication_profile.*` et `paraverbal_analysis.dimensions`, applique `resolveStart` sur chaque entrée et met à jour la ligne `reports`. Aucun appel IA, aucun coût.
- Déclencher ce backfill automatiquement à la première ouverture d'un rapport ancien depuis `useSessionDetail` si une entrée `fit_breakdown` a un `message_id` mais pas de `start_seconds`.

### Étape 3 — S'assurer que les futures sessions ont `transcript_segments`
- Vérifier dans `transcribe-session` que le mode "segments" est bien activé pour toutes les nouvelles transcriptions (le code existe ligne 249-256, mais les messages de cette session sont à `null` — soit la fonction n'a jamais tourné en mode segments, soit l'IA n'a pas renvoyé le format).
- Ajouter un log structuré côté `transcribe-session` quand `segments.length === 0` pour détecter ces cas et permettre un re-run via le bouton « Re-transcrire » existant.

## Détails techniques

- Côté client, `SessionVideoNavigator.playMessage` est déjà correct : il applique une marge adaptative et borne à `duration - 0.1`. Aucun changement à prévoir.
- Le format de citation IA peut contenir « … » ou des coupures (`Math.max(0, raw)` côté serveur tolère déjà les NaN).
- Le backfill peut être idempotent : si tous les `start_seconds` sont déjà non-nuls, on ne fait rien.

## Validation

Après mise en place : régénérer (ou backfill) le rapport de la session `f41b9c1d…`, cliquer sur « Voir le moment » de l'entrée « Sens du client & du détail » et vérifier que la vidéo démarre autour de 1:05 (et non à 0). Vérifier aussi sur 2-3 autres entrées (decision_drivers, signals).
