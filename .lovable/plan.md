# Plan — Questions passées écrasées + questions non enregistrées

## Constat vérifié en base (session Hicham Anouar)

1. **Les 3 réponses « hors sujet » sont en réalité des questions passées.** Les questions 5 (Utilisation de l'IA), 6 (Veille) et 7 (Rémunération) portent toutes la trace conservée « [Question passée] » : le candidat a cliqué sur « passer la question ». Mais la caméra continuait d'enregistrer et le fichier a été envoyé ; la transcription automatique est ensuite repassée dessus, y a trouvé du son ambiant (une vidéo YouTube sur les fractions) et **a écrasé la mention « question passée » par ce texte**. L'IA a donc noté ce bruit de fond comme des réponses d'entretien — d'où le 28/100.
   Ce n'est pas un problème de micro : le micro fonctionnait, il a simplement capté l'ambiance pendant un moment sans réponse.
2. **Les questions posées ne sont pas enregistrées.** Sur cette session, seules 2 lignes IA existent (accueil et clôture) et elles sont vides. Le texte des questions posées n'est jamais conservé, donc la transcription affiche « en attente » et le rapport travaille sur un échange incomplet.

## Correctif 1 — Ne plus écraser une question passée

- Quand le candidat passe une question, le média enregistré pendant ce laps de temps **n'est plus envoyé à la transcription** : la mention « question passée » est définitive.
- La question passée reste **non notée** dans le rapport (au lieu d'être notée sur du bruit de fond), et apparaît clairement comme « passée par le candidat ».
- Filet de sécurité : la transcription automatique ignore toute réponse déjà marquée « question passée », y compris pour les anciennes sessions.

## Correctif 2 — Réparer la session d'Hicham

- Remettre les 3 questions concernées sur « question passée » et régénérer son rapport, pour qu'il ne soit plus noté sur une vidéo de maths.
- La question 4 (« Fierté projet ») a une transcription hachée alors que sa vidéo est bien enregistrée : relancer sa transcription pour tenter de récupérer le texte complet.

## Correctif 3 — Enregistrer les questions posées

- Pendant l'entretien, chaque fois qu'une question est posée, son **texte est désormais conservé**, y compris quand la question est jouée en vidéo ou en audio pré-enregistré (le cas qui n'était jamais enregistré). Rien ne change pour le candidat.
- Affichage : pour les entretiens déjà passés, la question est reconstituée à partir du poste quand son texte manque, au lieu d'afficher « en attente ».
- Génération du rapport : ne plus insérer de lignes vides dans l'échange transmis à l'IA.

## Détails techniques

- `src/pages/InterviewStart.tsx` : `handleSkipQuestion` ne transmet plus `videoSegmentUrl` / `audioSegmentUrl` (le média reste stocké, il n'alimente plus la transcription) ; ajout de la persistance du texte de la question posée avec son `question_id`, y compris sur le chemin média pré-enregistré.
- `supabase/functions/transcribe-session/index.ts` : exclure les messages dont `content_raw = '[Question passée]'` ou `content = '[Question passée]'` de la liste des cibles.
- `supabase/functions/generate-report/index.ts` : exclure les réponses « [Question passée] » de la notation et les signaler comme non répondues ; ignorer les lignes IA vides dans la transcription envoyée à l'IA.
- `src/pages/SessionDetail.tsx` / `SessionReportView` : repli sur `projects.questions` via `question_id` quand la ligne de question est vide.
- Réparation ponctuelle de la session par mise à jour ciblée des 3 messages, puis régénération du rapport via le bouton existant.
- Validation : `bun run build` ; les fonctions modifiées partent à la prochaine publication.
