## Objectif
Dans le rapport recruteur (`/sessions/:id`) :
1. Remplacer la vidéo complète de l'onglet par le **best-of** (HighlightReelPlayer).
2. Renommer l'onglet « Vidéo » → **« Best-of »** (icône Trophy).
3. Diagnostiquer pourquoi le Big Five ne s'affiche plus sur la session en cours.

## Changements

### `src/pages/SessionDetail.tsx`
- **Import** : ajouter `HighlightReelPlayer` et `Trophy` (lucide).
- **Onglet « Vidéo »** :
  - Libellé : `Vidéo` → `Best-of`
  - Icône : `Video` → `Trophy`
  - Contenu : remplacer le `<video src={session.video_recording_url}>` par
    `<HighlightReelPlayer clips={(report?.highlight_clips as any) ?? []} />`.
  - Si pas de rapport ou pas de clips → fallback géré nativement par le composant ("Best-of indisponible pour cette session.").
- **Vidéo complète** : conservée dans la sidebar gauche (déjà en place), donc rien à changer là.

### Big Five (diagnostic, pas de code à modifier a priori)
- Le composant `PersonalityRadar` est déjà rendu dans l'onglet Synthèse (ligne ~245) avec `report.personality_profile`.
- Si rien ne s'affiche, deux causes possibles :
  1. Le rapport actuel a été généré avant l'ajout du champ → `personality_profile` est `null` → carte masquée.
  2. Le parsing IA n'a pas renvoyé le bloc → idem.
- **Action** : après déploiement, régénérer un rapport sur une session récente pour vérifier. Si toujours absent malgré une nouvelle génération, on inspectera les logs edge function `generate-report`.

## Inchangé
- Vidéo complète dans la sidebar gauche
- Tous les autres onglets (Synthèse, Questions, Transcription)
- Edge function `generate-report` (génère déjà `highlight_clips` et `personality_profile`)

## Validation
- Onglet renommé « Best-of » avec icône trophée.
- Lecture du best-of fonctionnelle (clips successifs, badges, compteur).
- Big Five visible dans Synthèse pour une session avec rapport récent.
