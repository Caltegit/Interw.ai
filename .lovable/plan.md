## Objectif
Agrandir la fenêtre du recruteur (et la vidéo de question) de **+30 %** par rapport aux tailles actuelles.

## Nouvelles tailles
| Élément | Avant | Après (+30 %) |
|---|---|---|
| Avatar IA — desktop | 520px | **680px** |
| Avatar IA — mobile | 320px | **420px** |
| Vidéo de question | 520px | **680px** |

## Fichier modifié
- `src/pages/InterviewStart.tsx`
  - Ligne 2664 : `max-w-[520px]` → `max-w-[680px]` (conteneur vidéo de question)
  - Ligne 2687 : `max-w-[320px] sm:max-w-[520px]` → `max-w-[420px] sm:max-w-[680px]` (avatar IA 16/9)

## Inchangé
- Format 16/9 (`aspect-video`)
- Cadrage `object-cover` centré
- Halo, anneau d'écoute, barres de niveau, badge « Marie — IA »
- Layout colonne et bouton « Passer la question »

## Validation
Vérifier sur desktop et sur le viewport actuel (714px) que la fenêtre reste centrée et ne déborde pas.