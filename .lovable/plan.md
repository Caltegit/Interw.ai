# Veille 30 jours : entretiens exposés au même défaut vidéo

## Ce que montre le relevé

Sur les 30 derniers jours : **148 entretiens** contiennent des réponses vidéo, soit **803 enregistrements**.

| Défaut | Entretiens | Fichiers |
|---|---|---|
| Ancienne adresse en base (ne charge plus depuis le passage en stockage privé) | 141 | 764 |
| Enregistrement WebM sans durée (écran noir sur Safari, barre de lecture vide ailleurs) | 82 | 577 |
| Les deux à la fois | 82 | — |

Autrement dit : **141 entretiens sur 148** portent au moins un défaut, et 82 d'entre eux cumulent les deux. Seuls 7 entretiens sont totalement sains (ceux déjà corrigés ce matin).

### Répartition par client

| Organisation | Poste | Entretiens WebM | Entretiens ancienne adresse |
|---|---|---|---|
| Castalie | Première étape Castalie | 26 | 27 |
| Ads up | Assistant.e Webmarketing | 12 | 18 |
| Ads up | Consultant.e Social Ads | 12 | 14 |
| Morning | Hospitalité | 9 | 14 |
| Morning | Premier entretien | 7 | 10 |
| Smash Group | Smash Group x Interw | 6 | 6 |
| E.Leclerc Quai 29 | Assistant(e) qualité | 2 | 2 |
| Vocca | AI Deployment Strategist | 2 | 2 |
| ALBO | 3 postes | 3 | 4 |
| Zenior, Regen School, With Gardner | 1 poste chacun | 3 | 3 |
| Tango | Vidéo de présentation | 0 | 41 |

Les 41 entretiens Tango sont des vidéos importées : uniquement l'ancienne adresse, aucun fichier à reconvertir.

## Ce que je propose

Le même traitement que pour les 7 entretiens de ce matin, appliqué en série et contrôlé fichier par fichier.

### Lot 1 — Remettre les adresses au bon format (141 entretiens, 764 fichiers)

Remplacement de l'ancienne adresse publique par le chemin interne, vidéo et audio. Traitement rapide, sans toucher aux fichiers. C'est ce qui fait réapparaître les entretiens dont les enregistrements sont déjà sains, dont les 41 de Tango.

### Lot 2 — Convertir les enregistrements WebM (82 entretiens, 577 fichiers)

Par lots de 25 fichiers, avec pour chacun :

- sauvegarde du fichier d'origine, jamais supprimé ;
- conversion en MP4 lisible par tous les navigateurs, durée correcte, en-tête en tête de fichier ;
- contrôle automatique : durée non nulle, image non noire, son présent ;
- mise à jour de la référence uniquement après ce contrôle ;
- journal complet, et signalement nominatif de tout fichier en échec.

Le volume est important (environ 577 conversions) : le traitement sera découpé sur plusieurs passages, en commençant par les clients qui consultent leurs entretiens en ce moment (Castalie, Ads up, Morning).

Aucun rapport, aucune note, aucune transcription n'est recalculée.

### Lot 3 — Contrôle final

Nouveau relevé identique après traitement : l'objectif est zéro entretien en ancienne adresse et zéro entretien en WebM sur la période.

## Prévention

Tant que le format d'enregistrement n'est pas changé, chaque nouvel entretien passé sur Chrome ou Firefox recrée un fichier WebM et le problème revient. Deux options, à trancher après ce rattrapage :

1. **Enregistrer directement en MP4** quand le navigateur le sait faire. Le plus propre, mais cela touche l'enregistrement en direct chez le candidat : à valider sur un entretien de test avant généralisation.
2. **Convertir automatiquement à la fin de chaque entretien**, en tâche de fond, sans rien changer côté candidat.

## Détails techniques

- Relevé issu de `session_messages` (role `candidate`, `timestamp` sur 30 jours), joint aux entretiens, postes et organisations.
- Lot 1 : normalisation `video_segment_url` / `audio_segment_url` vers `interviews/<session>/<fichier>`.
- Lot 2 : `ffmpeg -c:v libx264 -crf 23 -c:a aac -movflags +faststart`, contrôle `ffprobe` (durée) et luminosité moyenne de l'image, dépôt en `x-upsert` sur le même chemin en `.mp4`.
- Le stockage reste privé ; les liens continuent de passer par l'accès signé.

## Vérifications

- Relevé avant / après sur les mêmes requêtes.
- Lecture dans l'application d'un entretien par client traité, sur Chrome et Safari.
- Comparaison des durées avant / après sur l'ensemble des fichiers convertis.
