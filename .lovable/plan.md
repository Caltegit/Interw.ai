# Plan — Transcription des questions IA + détection des réponses parasites

## Constat (vérifié sur la session de Hicham Anouar)

1. **Questions IA absentes de la transcription** : seules 2 lignes IA sont enregistrées (accueil vide + clôture). Les questions posées en vidéo/audio pré-enregistré ne sont jamais écrites en base, et les transitions ne portent pas le `question_id`. Résultat : la transcription affiche les questions « en attente » et le rapport se base sur un fil incomplet.
2. **Réponses parasites notées comme de vraies réponses** : 3 réponses de la session sont en réalité la bande-son d'une vidéo YouTube (« Bonjour tout le monde ! On se retrouve aujourd'hui… »). L'IA les a notées comme des réponses, ce qui a plombé le score (28/100) sans signaler l'anomalie au recruteur.

## Correctif 1 — Enregistrer les questions posées

- Pendant l'entretien : chaque fois qu'une question est posée au candidat, son **texte est désormais enregistré**, même quand la question est posée par une vidéo ou un audio pré-enregistré (c'est ce cas qui n'était jamais enregistré aujourd'hui). Rien ne change pour le candidat : l'entretien se déroule exactement comme avant, on garde simplement une trace écrite de chaque question posée.
- `src/pages/SessionDetail.tsx` (affichage) : filet de sécurité pour les anciennes sessions — avant chaque réponse candidat, afficher la question correspondante via `question_id` → `projects.questions` quand le message IA est vide ou absent.
- `supabase/functions/generate-report/index.ts` : ne pas insérer de lignes vides (« persona : ») dans la transcription envoyée à l'IA quand une ligne de question posée par l'IA a été enregistrée sans texte.

## Correctif 2 — Détection des réponses parasites

- Migration : ajouter la colonne `transcript_flag` (texte, valeur nulle par défaut) sur `session_messages`.
- `supabase/functions/transcribe-session/index.ts` : le prompt de transcription demande en plus à l'IA de classer chaque segment — `external_audio` (lecture d'une vidéo/musique/voix multiples, manifestement pas le candidat qui répond) — et stocke le résultat dans `transcript_flag`.
- `supabase/functions/generate-report/index.ts` : les réponses marquées `external_audio` sont **exclues de la notation** et signalées dans le rapport comme alerte d'intégrité (« réponse non évaluée : audio externe détecté »), au lieu d'être notées comme du contenu.
- `src/pages/SessionDetail.tsx` : badge « Audio externe suspecté » sur la réponse concernée.
- Pas de re-traitement automatique des anciennes sessions (coût/quota) : la détection s'applique aux nouvelles transcriptions ; la session de Hicham Anouar peut être re-transcrite manuellement via le bouton existant si tu veux la tester.

## Détails techniques

- Colonne `transcript_flag text null` sur `session_messages` (migration unique, table existante : pas de GRANT supplémentaire).
- Prompt Gemini de transcription étendu : retour JSON `{"segments":[...], "flag":"external_audio"|null}` ; rétrocompatible si le champ est absent.
- `generate-report` : filtre `transcript_flag is distinct from 'external_audio'` pour les preuves de scoring, ajout d'une ligne d'alerte par réponse exclue dans le bloc `red_flags` existant.
- Build `bun run build` pour valider ; les fonctions modifiées partent à la prochaine publication.
