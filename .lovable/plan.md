## Objectif

Faire remonter le score d'attitude vers une moyenne réaliste (60-70 pour un candidat correct, au lieu de 35-45 aujourd'hui) en corrigeant 4 biais structurels, puis relancer l'analyse sur les 50 dernières sessions pour rétroactivement bénéficier de la correction.

## Changements

### 1. Edge function `analyze-nonverbal/index.ts`

**A — Plus de segments analysés (2 → 4)**
- `MAX_SEGMENTS = 4` (au lieu de 2)
- Sélection mieux distribuée : 1er, 2 du milieu, dernier segment candidat (au lieu des 2 premiers). Si <4 réponses, on prend tout.
- Garde-fou : si payload total >50 Mo, on retombe à 3 puis 2 segments.

**B — Recalibrer `eye_contact` pour la vidéo d'entretien IA**
- Le candidat regarde l'avatar à l'écran, pas la caméra. Reformuler la consigne :
  - "10 = regard orienté vers l'écran/caméra de façon stable et engagée. Un candidat qui regarde l'avatar à l'écran obtient 8-10, pas 4-5. Pénaliser uniquement les fuites de regard répétées (plafond, côté, lecture de notes)."
- Renommer le tooltip côté UI : "Contact visuel" → "Présence du regard" (plus juste pour le format).

**C — Rubrique explicite 5 niveaux dans le prompt système**
Ajouter au `systemPrompt` une grille calibrée pour TOUTES les dimensions :
```
Échelle (utilise toute la plage, pas seulement 4-6) :
- 10 : exceptionnel, niveau commercial/média
- 8-9 : très bon, naturel et engageant (cible standard d'un bon candidat)
- 6-7 : correct, quelques points d'amélioration mineurs (moyenne attendue)
- 4-5 : visible inconfort ou rigidité, sans bloquer la communication
- 2-3 : gêne marquée qui nuit clairement à l'échange
- 0-1 : extrêmement problématique
Un candidat "moyen normal" se situe à 6-7, PAS à 5. N'utilise pas 5 par défaut.
```

**D — Mapping sigmoïde score 0-10 → 0-100**
Remplacer le `×10` brut dans `NonverbalBadge.computeNonverbalAverage` par une courbe qui aligne la perception RH :
| score brut /10 | affiché /100 |
|---|---|
| 3 | 30 |
| 4 | 42 |
| 5 | 58 |
| 6 | 70 |
| 7 | 80 |
| 8 | 88 |
| 9 | 94 |

Implémentation simple par interpolation linéaire par morceaux (table de points + lerp). Pas de seuils d'affichage modifiés à ce stade (E reporté).

### 2. Rétroactif — relancer les 50 dernières sessions

Nouvelle edge function **`replay-nonverbal-batch`** (one-shot, déclenchée manuellement via `supabase.functions.invoke` ou `curl`) :
- Sélectionne les 50 sessions `completed` les plus récentes ayant un `report` et au moins un `session_messages.video_segment_url`.
- Pour chacune, appelle `analyze-nonverbal` avec `{ session_id, force: true }`, en série (1 toutes les 3s) pour ne pas saturer la passerelle IA.
- Logue résumé : nb relancées / nb skipped / erreurs.
- Protégée par check super-admin (`has_role(user, 'super_admin')`).

Le mapping sigmoïde (D) étant côté front, il s'appliquera immédiatement à TOUTES les sessions existantes dès le déploiement — pas besoin de re-générer pour D. La relance des 50 sert à bénéficier de A+B+C (nouveaux scores Gemini plus justes).

## Détails techniques

- Fichiers modifiés :
  - `supabase/functions/analyze-nonverbal/index.ts` (MAX_SEGMENTS, sélection segments, prompt + rubrique, libellé eye_contact)
  - `src/components/session/NonverbalBadge.tsx` (fonction `computeNonverbalAverage` avec interpolation)
  - `src/components/session/NonverbalProfileCard.tsx` (libellé "Contact visuel" → "Présence du regard")
- Fichier créé :
  - `supabase/functions/replay-nonverbal-batch/index.ts`
- Pas de migration DB nécessaire.
- Pas de changement des seuils d'affichage badge (orange/vert/rouge) — on observe d'abord l'effet du combo.

## Validation

1. Build OK
2. Vérifier sur 1 session test (via `supabase--curl_edge_functions` sur `analyze-nonverbal` avec `force: true`) que le payload retourné a des scores 6-8 plutôt que 3-5
3. Vérifier l'UI : badge passe au vert/orange clair sur sessions historiques
4. Lancer `replay-nonverbal-batch` et observer logs

## Hors scope

- E (seuils d'affichage) : à décider après avoir vu la distribution post-déploiement
- Modification de l'analyse para-verbale (audio) : pas demandé
