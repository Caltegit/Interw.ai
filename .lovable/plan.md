## Objectif

Ajouter dans le rapport de session, **au-dessus du Best-of**, un lecteur vidéo permettant de visionner question par question, avec navigation Précédent / Suivant.

Pas de génération backend : on réutilise les segments vidéo déjà enregistrés (`session_messages.video_segment_url`).

## Comportement

- Une vignette vidéo avec player HTML natif (play / pause / seek / volume / plein écran).
- En haut : libellé « Question N · {texte de la question} » + badge « Relance » si c'est un follow-up.
- En bas : bouton **Précédent**, indicateur **N / Total**, bouton **Suivant**.
- Les segments sont triés par timestamp. Une réponse principale et ses relances sont chacune un item navigable.
- Si aucun segment vidéo : carte masquée (pas de bloc vide).

## Emplacement

Dans `src/pages/SessionDetail.tsx`, colonne droite, **avant** la carte « Best-of ».
Même intégration dans `src/pages/SharedReport.tsx` pour que le recruteur partagé voie aussi le lecteur.

## Détails techniques

**Nouveau composant** `src/components/session/SessionVideoNavigator.tsx` :
- Props : `clips: { url: string; questionLabel: string; isFollowUp: boolean }[]`
- État local `index`. Réutilise `<video controls>` natif (cohérent avec ce qui existe déjà dans `SharedReport`).
- Quand `index` change, on remet `currentTime = 0` et on relance la lecture si une lecture était en cours.

**Construction des clips** (dans `SessionDetail` et `SharedReport`) :
- Filtrer `messages` où `role === "candidate"` et `video_segment_url` présent.
- Trier par `timestamp`.
- Mapper le `question_id` vers son `order_index` pour afficher « Question N ».
- Marquer `is_follow_up` pour l'étiquette « Relance ».

Aucune migration DB, aucune edge function, aucun nouveau bucket.

## Diagramme

```text
┌─────────────────────────────────┐
│ Question 2 · Parlez-nous de…    │
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │     [vidéo + controls]      │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│ [◀ Précédent]   2 / 5   [Suivant ▶] │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Best-of                         │
└─────────────────────────────────┘
```
