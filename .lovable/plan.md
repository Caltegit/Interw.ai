## Objectif

Côté candidat, rendre le temps imparti d'une question beaucoup plus visible, le faire grossir dans les 20 dernières secondes, et garantir que le bouton « Envoyer ma réponse » se déclenche automatiquement à 00:00.

## État actuel (constaté dans `src/pages/InterviewStart.tsx`)

- Le timer existe déjà mais il est rendu en `text-xs font-mono` (très petit) à deux endroits du bandeau d'état (lignes 3758 et 3784).
- Couleur passe en `text-warning` quand il reste < 20 % du temps, `text-destructive` quand < 10 %. Pas de changement de taille.
- L'envoi automatique à expiration **est déjà implémenté** (ligne 3198-3201) via `handleSendResponseRef.current?.()`. À vérifier qu'il déclenche bien la même action que le clic manuel sur le bouton.
- Toast d'avertissement actuel : « Plus que 2 minutes » à `max - 120 s`.

## Changements UI/UX

1. **Timer beaucoup plus visible en permanence**
   - Format actuel `02:30 / 05:00` → simplifier en **temps restant uniquement** au format `MM:SS` (le candidat n'a pas besoin de calculer).
   - Taille de base : passer de `text-xs` à `text-base sm:text-lg`, `font-bold tabular-nums`.
   - Le placer dans un badge dédié (fond légèrement teinté, bord arrondi) à côté du micro/CTA, pas noyé dans le texte.
   - Garder une icône horloge (`Clock` de lucide-react) à gauche du chiffre.

2. **Palier visuel à 20 s** (la demande explicite)
   - À `remaining ≤ 20 s` : taille bondit à `text-2xl sm:text-3xl`, couleur `text-destructive`, badge passe sur fond `bg-destructive/15` avec bord `border-destructive/40`, et léger `animate-pulse` (subtil, pas agressif).
   - À `remaining ≤ 10 s` : ajouter en plus un compte à rebours sec (chiffre seul, `text-4xl sm:text-5xl font-black`, `tabular-nums`) pour bien marquer la fin imminente.
   - Annonce accessibilité : `aria-live="polite"` sur le badge + `aria-live="assertive"` quand on bascule sous 20 s (une seule fois).

3. **Seuils intermédiaires conservés**
   - `> 20 s` : couleur neutre (`text-foreground`), taille standard.
   - Pas de changement avant 20 s : on évite la sur-alerte (warning orange à 20 % du temps disparaît au profit du nouveau palier 20 s unique).

4. **Toast d'avertissement**
   - Remplacer le toast « Plus que 2 minutes » par un toast unique à **30 s restantes** : « 30 secondes restantes — votre réponse sera envoyée automatiquement à 0:00 ». Plus pertinent que 2 min pour des réponses parfois courtes.

## Envoi automatique à expiration

Déjà en place (ligne 3198 de `InterviewStart.tsx`). À vérifier explicitement pendant l'implémentation :

- À `remaining = 0`, on appelle bien `handleSendResponseRef.current?.()`, qui est la même fonction que celle bindée au clic du bouton « Envoyer ma réponse » (ligne 3789-3800).
- Le toggle se fait une seule fois (le `useEffect` ne re-déclenche pas à chaque tick une fois envoyé : à protéger via un `ref` `autoSentRef` mis à `true` après l'appel, reset au changement de question).
- Quand l'envoi auto se déclenche, afficher un petit toast informatif : « Temps écoulé — réponse envoyée ».

## Fichiers touchés

- `src/pages/InterviewStart.tsx` (seul fichier modifié) :
  - Bloc IIFE du bandeau d'état (~ lignes 3728-3810) : nouveau composant inline `<ResponseTimer />` ou refactor du badge timer.
  - Ajout d'un `useRef autoSentRef` et garde dans le `useEffect` ligne 3186.
  - Toast 30 s remplace toast 2 min.

## Hors périmètre

- Pas de changement du timer max (toujours 10 min plafond, ou valeur `max_response_seconds` de la question).
- Pas de changement de la logique de pause / auto-skip silence.
- Pas de modif backend.

## Vérification avant publication

- Tester sur une question avec `max_response_seconds = 30` (pour valider rapidement le palier 20 s + l'envoi auto).
- Tester sur une question sans limite configurée (fallback 600 s).
- Vérifier que le clic manuel sur « Envoyer ma réponse » fonctionne toujours et que l'auto-envoi ne double-trigger pas si le candidat clique à 0:01.
- Vérifier le rendu mobile (375 px) : le chiffre du compte à rebours ne casse pas le layout.

Valide et j'implémente.
