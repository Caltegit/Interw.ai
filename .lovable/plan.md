## Problème

Dans les cartes **Oral** (paraverbal) et **Attitude** (nonverbal), les boutons "Voir" présents à côté de chaque dimension ne fonctionnent pas correctement :

- L'analyse IA ne renvoie pas de timestamp précis (pas de `evidence_start_seconds`), seulement un `evidence_message_id`.
- Pour le paraverbal, le `message_id` cible parfois un segment audio seul → `SessionVideoNavigator` ne le trouve pas dans `sessionClips` (filtré sur `video_segment_url`) → toast "Extrait vidéo indisponible".
- Quand ça passe, la vidéo saute au début du clip mais sans repère utile.

## Solution retenue

Garder les boutons mais les faire pointer vers **le début du clip vidéo de la question concernée**, en utilisant un mapping fiable `message_id (audio ou vidéo) → message_id du clip vidéo de la même question`.

## Changements

### 1. `src/pages/SessionDetail.tsx` et `src/pages/SharedReport.tsx`

- Construire un mapping `audioOrVideoMessageId → videoMessageId` basé sur le `question_id` partagé : pour tout message candidat (audio ou vidéo), retrouver le message candidat vidéo de la même `question_id`.
- Passer ce mapping aux cartes `ParaverbalProfileCard` et `NonverbalProfileCard` via une nouvelle prop `resolveVideoMessageId`.

### 2. `src/components/session/ParaverbalProfileCard.tsx` et `NonverbalProfileCard.tsx`

- Accepter la prop `resolveVideoMessageId?: (id: string) => string | undefined`.
- Avant de passer `messageId` à `EvidenceLink`, le résoudre via cette fonction.
- Forcer `startSeconds={undefined}` (on saute au début de la question — pas de timestamp précis).

### 3. `src/components/session/EvidenceLink.tsx`

Aucun changement nécessaire : le rendu "Q3" sans timestamp est déjà géré (`hasTime` est `false` quand `startSeconds` est `undefined`).

## Détails techniques

- Si aucune correspondance vidéo n'existe pour la question (cas rare : entretien audio seul), on cache simplement le bouton "Voir" en passant `messageId={undefined}` plutôt que d'afficher un toast d'erreur.
- Pas de changement backend : aucune régénération de rapport nécessaire, le fix est purement côté affichage.

## Vérification

- Ouvrir une session avec analyse paraverbale et nonverbale.
- Cliquer sur les boutons "Q*n*" des cartes Oral et Attitude → la bonne question doit se charger dans le lecteur vidéo en bas, sans toast d'erreur et sans glitch de lecture.