## Diagnostic

Le badge affiché en haut à gauche du recruteur pendant la session candidat concatène `projects.ai_persona_name` (ici `"Clément"`) avec le suffixe codé en dur `" — IA"`, d'où « Clément — IA ».

## Vérification d'impact

Recherche exhaustive du suffixe dans `src/`, `tests/`, `supabase/` :
- **2 occurrences uniquement**, toutes deux dans `src/pages/InterviewStart.tsx` (lignes 4073 et 4115).
- Aucun test E2E ne vérifie ce libellé.
- Aucune fonction edge, aucun rapport, aucun transcript, aucun composant partagé ne le référence.
- Aucun impact BDD, TTS, voix, session, analyse ou export.

→ Suppression purement cosmétique, sans effet de bord.

## Changement

Fichier : `src/pages/InterviewStart.tsx`

- **Ligne 4073** (badge sur vidéo du recruteur) :
  ```tsx
  {project?.ai_persona_name || "Marie"} — IA
  ```
  →
  ```tsx
  {project?.ai_persona_name || "Marie"}
  ```

- **Ligne 4115** (badge sur avatar image du recruteur) : même changement.

Résultat côté candidat : le badge affiche uniquement `Clément` (ou le prénom saisi dans « Qui recrute → Son prénom »), fallback `Marie` si le champ est vide.
