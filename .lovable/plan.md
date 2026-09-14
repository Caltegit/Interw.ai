# Entretiens qui « coupent » : rendre la cause visible et arrêter les sessions vides

## Ce que le cas Thibault Roubertie a révélé (vérifié en base)

- 13 sessions créées en 37 minutes, une seule exploitable. Son micro renvoie un signal très faible (alertes « signal trop faible » relevées à plusieurs reprises).
- Quand plus aucune voix n'est captée, l'entretien se met en pause tout seul, annonce un arrêt, puis se ferme. Côté candidat, cela ressemble à « ça coupe » sans explication de la cause.
- Plusieurs de ses sessions sont enregistrées comme **terminées alors qu'aucune réponse n'a été captée** : la clôture automatique passe la session en « terminée » dès qu'elle retrouve un fragment vidéo, même quand ce fragment ne peut être rattaché à aucune réponse. Conséquence : le rapport part en génération puis échoue avec « aucun enregistrement disponible », et le recruteur voit des sessions terminées vides.
- Aucune de ces sessions ne porte de raison d'arrêt : la clôture automatique ne la renseigne pas.

## Correctifs proposés

### 1. Ne plus déclarer « terminée » une session sans réponse exploitable

Dans la clôture automatique, exiger qu'au moins une réponse de candidat ait bien été rattachée à un enregistrement. Sinon, la session est fermée en « annulée » avec une raison explicite, aucun rapport n'est lancé, et le recruteur ne voit plus de session terminée vide.

### 2. Renseigner systématiquement la raison d'arrêt

Chaque fermeture automatique enregistre pourquoi : aucun enregistrement récupérable, enregistrements présents mais non rattachables, ou récupération réussie. La fiche recruteur affiche déjà cette information.

### 3. Dire au candidat ce qui se passe

- La fenêtre bloquante au démarrage explique aujourd'hui « micro indisponible ». Y ajouter les gestes concrets : choisir le bon micro, monter le volume d'entrée de l'ordinateur, éviter un micro éloigné.
- Au moment de l'arrêt automatique pour absence de voix, remplacer le simple « Session terminée » par un écran qui nomme la cause (« nous n'avons plus capté votre voix ») et indique quoi faire avant de relancer.
- Quand le niveau est faible depuis un moment, l'alerte existante est conservée ; on y ajoute seulement la mention du réglage de volume système.

Rien n'est modifié dans l'analyse, le scoring, la transcription, ni dans les autres organisations ou projets. Aucun e-mail candidat n'est envoyé.

## Détails techniques

- `supabase/functions/finalize-abandoned-session/index.ts` : la bascule en `completed` (ligne ~423) est conditionnée à `messagesUpdated > 0` et non plus à `recoveredQuestions > 0` ; sinon `status = 'cancelled'`, `cancelled_at`, `end_reason = 'no_linked_media'`. Le cas `recoveredQuestions === 0` renseigne `end_reason = 'no_media'`. Cas de réussite : `end_reason = 'recovered'`. Colonne `sessions.end_reason` déjà existante, aucune migration nécessaire.
- `src/components/interview/MicBlockingDialog.tsx` : texte enrichi (liste de 3 vérifications), bouton inchangé.
- `src/pages/InterviewStart.tsx` : uniquement le bloc d'arrêt forcé pour silence (`endCountdown`, ~ligne 4133 et le `toast` « Session terminée ») — libellé et message explicatifs. Aucun découpage de fichier, aucune autre logique touchée.
- `src/components/interview/MicFailureBanner.tsx` : une phrase ajoutée au cas `too-quiet`.

## Vérifications

1. Typecheck.
2. Une session sans réponse rattachée se retrouve en « annulée » avec sa raison, et aucun rapport n'est mis en file.
3. Les sessions vides existantes de Thibault restent telles quelles (pas de reprise rétroactive, sauf demande).
4. Capture navigateur du parcours candidat : démarrage normal inchangé, message d'arrêt pour silence lisible.
