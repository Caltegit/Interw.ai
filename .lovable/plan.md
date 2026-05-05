## Diagnostic

Dans le projet, l'option **« Laisser l'IA s'adapter au contexte des réponses »** (mode `auto` des transitions) est bien sélectionnée et envoyée à l'edge function `ai-conversation-turn`. Mais le prompt système force l'IA à utiliser des phrases quasi figées :

```
Pour "next" : courte transition (max 2 phrases).
Si la question suivante est AUDIO ou VIDÉO,
  dis seulement « Écoutez la question suivante » ou « Regardez la question suivante ».
Si elle est en TEXTE, pose-la directement.
```

Conséquences :
- Pour une question vidéo/audio → l'IA dit toujours littéralement « Écoutez/Regardez la question suivante », sans aucun rebond sur la réponse précédente.
- Pour une question texte → l'IA enchaîne directement la question, sans accusé de réception.
- Résultat : le candidat a l'impression d'entendre la même transition à chaque fois, contrairement à ce que promet le libellé du paramètre.

À noter : le mode `custom` (texte fixe) fonctionne déjà comme attendu, et le mode `auto` actuel ne change pas selon la qualité de la réponse — donc le bug est bien dans le prompt côté serveur.

## Correction

### 1. `supabase/functions/ai-conversation-turn/index.ts`

Réécrire la branche `"next"` du prompt pour que l'IA :
- Commence par **un mini rebond personnalisé** sur la dernière réponse du candidat (1 phrase courte, qui reprend un mot-clé ou une idée concrète de sa réponse — sans flatter, sans répéter mot pour mot, sans « merci » mécanique systématique).
- Enchaîne avec une **annonce naturelle** de la question suivante :
  - texte → pose la question directement après le rebond,
  - audio → invite à écouter (formulation libre, ex. « Écoutons maintenant la suivante. », « Voici la prochaine, à l'oreille. »…),
  - vidéo → invite à regarder (formulation libre).
- Reste bref (≤ 2 phrases au total), professionnel, en français, jamais robotique.
- Si la dernière réponse est vide / incompréhensible / hors sujet, ne pas inventer de rebond : passer directement à l'annonce.

Garder les garde-fous existants (action `next` vs `end`, nettoyage des messages contradictoires en `follow_up`, message de clôture sur `end`).

### 2. `src/pages/InterviewStart.tsx`

- Garder le fallback local actuel (« Merci. Regardez/Écoutez la question suivante. ») uniquement comme filet de sécurité quand l'IA renvoie une chaîne vide ou que l'appel échoue. Inchangé sur le principe.
- Aucun changement du flux d'entretien ni de la logique de relance.

### 3. Hors scope

- Pas de modification DB, ni du formulaire projet (le libellé existant reste correct une fois le prompt corrigé).
- Pas de touche au mode `custom`, ni à l'intro IA, ni aux relances (`follow_up`).
- Pas de changement du cache TTS : les phrases statiques `nextAudio` / `nextVideo` continuent d'exister comme fallback rapide quand l'IA est indisponible.

## Test manuel

1. Projet avec transitions `auto` + 3 questions (1 texte, 1 audio, 1 vidéo).
2. Lancer une session, donner 3 réponses différentes (ex. parler de Python, puis de management, puis d'un échec).
3. Vérifier que chaque transition fait un mini rebond différent qui reprend un élément concret de la réponse précédente, puis annonce la question suivante de façon variée.
4. Donner volontairement une réponse vide / « je sais pas » → la transition doit passer directement à l'annonce, sans rebond inventé.
5. Couper la connexion juste avant la transition → le fallback local (« Merci. Regardez/Écoutez la question suivante. ») doit toujours s'afficher.
