## Contexte

Les vidéos des sessions ALBO existantes sont **toujours stockées** (Supabase Storage) et accessibles via `video_segment_url`. Elles n'ont pas été perdues. Le problème est uniquement leur **transcription**, qui a échoué parce que les segments dépassent 18 Mo et que la voie inline Gemini ne les acceptait pas.

Depuis hier, l'API Files Gemini est déployée (jusqu'à 200 Mo / ~10 min). Il suffit donc de **rejouer la transcription** sur les segments `failed` puis de **régénérer les rapports**.

## Recommandation

Approche en 2 temps : un correctif manuel ciblé pour les sessions ALBO existantes, plus un filet de sécurité pour éviter que ça se reproduise.

### Étape 1 — Récupérer les sessions ALBO existantes (one-shot)

Plutôt que de cliquer manuellement sur "Re-transcrire" dans chaque rapport, lancer un script côté serveur qui :

1. Liste les sessions ALBO `completed` ayant au moins un segment en `failed`.
2. Pour chacune, appelle l'edge function `transcribe-session` avec `force: false` (ne touche pas aux segments déjà `done`, ne ré-essaie que les `failed` et `pending`).
3. Une fois la transcription rejouée, appelle `generate-report` pour produire / regénérer le rapport.

Sessions concernées identifiées :
- Cyrille ROBERT — 14 segments à reprendre, rapport à créer
- Coulondre — 11 segments à reprendre, rapport à créer
- Clem Guerveno — 13 segments à reprendre, rapport à régénérer
- Guilbert — 2 segments à reprendre, rapport à régénérer
- JAMES SCHOUTETEN — 0 segments échoués, juste rapport à générer

Exécution via `code--exec` (curl vers les edge functions, séquentiel pour respecter le rate limit Gemini, ~30 s par session).

### Étape 2 — Auto-retry dans `generate-report` (filet de sécurité)

Avant de générer le rapport, `generate-report` vérifie s'il reste des segments `failed`. Si oui, il appelle automatiquement `transcribe-session` avec `force: false` puis recharge les messages. Comme ça, dès qu'un RH clique "Générer le rapport" sur une vieille session, la récupération se fait toute seule.

### Hors périmètre

- Pas de modification de la base ni du flux candidat (déjà corrigé hier avec la limite 10 min).
- Pas de re-encodage / découpage des vidéos : la voie Files Gemini les accepte telles quelles.
- Pas de bouton bulk dans l'UI pour l'instant — si le besoin se confirme, on pourra l'ajouter sur la page ALBO côté liste candidats.

## Ce qui sera modifié

- **Aucun fichier code modifié** pour l'étape 1 (script one-shot via `code--exec`).
- **`supabase/functions/generate-report/index.ts`** pour l'étape 2 : ajout d'un appel interne à `transcribe-session` si segments `failed` détectés.

## Question avant exécution

Veux-tu que je :
- (a) lance maintenant **le rattrapage des 5 sessions ALBO** + ajoute le **filet de sécurité** dans `generate-report` ?
- (b) uniquement le **rattrapage one-shot** (plus rapide, sans modifier le code) ?
- (c) uniquement le **filet de sécurité** (tu déclencheras toi-même via le bouton "Re-transcrire" dans chaque rapport) ?
