## Problème

Sur l'écran de préparation affiché juste avant la première question (session candidat et démo), une des étapes s'appelle « **Préparation de la voix de l'IA** ». Or la voix peut être une vraie voix humaine clonée — le libellé est donc trompeur.

## Correction

Remplacer le libellé par un terme neutre qui ne présume pas de la nature de la voix.

**Nouveau libellé :** « Préparation de la voix »

### Fichiers modifiés

1. `src/pages/InterviewStart.tsx`
   - Ligne 2400 : `label: "Préparation de la voix de l'IA"` → `label: "Préparation de la voix"`
   - Ligne 2549 : idem

2. `src/components/interview/InterviewBootProgress.tsx`
   - Ligne 20 (commentaire interne) : « la voix IA est chaude » → « la voix est chaude »

## Hors périmètre

- Les autres mentions de « voix IA » ailleurs dans l'app (page Landing FAQ, page IntroLibrary) : elles décrivent une fonctionnalité produit distincte (TTS pur, sans clonage), le terme y reste correct. Rien à changer.
- L'écran de préparation lui-même (design, autres étapes) : inchangé.