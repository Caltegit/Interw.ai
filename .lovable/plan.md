

## Améliorer l'UX d'écoute pendant l'entretien

### Changement 1 — Masquer le bouton tant qu'aucune voix n'est détectée

Dans `src/pages/InterviewStart.tsx`, le bouton « ✓ Ma réponse est finie » est aujourd'hui **toujours affiché** (juste grisé tant que rien n'est transcrit). On le **masque complètement** tant que la reconnaissance vocale n'a rien capté.

- Condition d'affichage : `isListening && (liveTranscript || candidateTranscriptRef.current)` → bouton vert apparaît.
- Sinon (en écoute mais silence) : pas de bouton, à la place on montre une **invitation pleine largeur** (voir changement 2).
- États `isSpeaking` (lecture question) et `isProcessing` (analyse) : on continue à afficher un bouton désactivé contextuel comme aujourd'hui, pour que la zone ne saute pas visuellement.

### Changement 2 — Bandeau "À vous de répondre" beaucoup plus visible

Quand l'IA finit de poser la question et qu'on passe en mode écoute (`isListening && !isSpeaking && !isProcessing`), on remplace le petit bandeau actuel par un **gros call-to-action vert** :

- Bandeau plus grand : padding `py-5`, fond `bg-emerald-500/15`, bordure `border-2 border-emerald-500/50`, texte `text-base sm:text-lg font-semibold`.
- Icône micro **plus grosse** (`h-6 w-6`) avec **double pulse** (cercle d'onde animé autour) pour évoquer la captation live.
- Texte principal : **« 🎙️ À vous ! Parlez maintenant »**
- Sous-texte plus petit : *« Le bouton "Ma réponse est finie" apparaîtra dès que je vous entendrai. »* (visible seulement Q1-Q2, comme l'aide actuelle).

Quand le candidat commence à parler (transcription non vide) :
- Le bandeau **se réduit** à sa taille actuelle (status compact « Écoute en cours… »).
- Le **bouton vert apparaît** en dessous.

### Logique d'état (résumé)

```text
Phase                              | Bandeau                          | Bouton
-----------------------------------|----------------------------------|--------------------------------
isSpeaking (IA parle)              | Bleu compact "L'IA pose…"        | Désactivé "Écoutez…"
isListening + transcript vide      | GROS bandeau vert "À vous !"     | MASQUÉ
isListening + transcript non vide  | Vert compact "Écoute en cours…"  | Vert "✓ Ma réponse est finie"
isProcessing                       | Ambre compact "Analyse…"         | Désactivé "Traitement…"
```

### Fichier modifié

- `src/pages/InterviewStart.tsx` (uniquement la zone JSX lignes ~1008-1073).

### Hors scope

- Pas d'ajout de visualisation niveau audio (barres VU-mètre) — peut être une étape suivante si tu veux.
- Pas de modification du flux d'auto-skip.

