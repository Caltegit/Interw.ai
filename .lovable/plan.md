## Objectif

Créer une page super-admin permettant d'écouter le **même texte** lu par plusieurs voix (ElevenLabs + Gemini TTS) **à l'aveugle**, voter sa préférée, puis révéler les voix. Objectif : décider de manière objective si on peut diviser le coût TTS par 12 sans perte perçue.

## Ce qui sera construit

### 1. Nouvelle edge function `tts-gemini`
Fichier : `supabase/functions/tts-gemini/index.ts`
- Utilise le Lovable AI Gateway (modèle `gemini-2.5-flash-preview-tts`)
- Aucune clé API à fournir (LOVABLE_API_KEY déjà configuré)
- Paramètres : `text`, `voiceName` (Kore, Charon, Aoede, Orus…)
- Renvoie un audio MP3, même format que `tts-elevenlabs`
- Réservée aux utilisateurs authentifiés (mode preview, comme l'existant)

### 2. Nouvelle page `/admin/tts-compare`
Fichier : `src/pages/AdminTtsCompare.tsx`, ajoutée à `App.tsx` derrière `SuperAdminRoute`.

Contenu de la page :
- Un champ **texte** pré-rempli avec une vraie question d'entretien type (modifiable)
- Un bouton **« Générer toutes les versions »** qui appelle en parallèle :
  - ElevenLabs (Charlotte FR) — référence actuelle
  - Gemini TTS voix **Kore** (féminine, posée)
  - Gemini TTS voix **Charon** (masculine, calme)
  - Gemini TTS voix **Aoede** (féminine, fluide)
- 4 lecteurs audio affichés dans un **ordre randomisé**, étiquetés simplement « Voix A / B / C / D » (sans dévoiler le provider)
- Sous chaque lecteur : un bouton **« Je préfère celle-ci »**
- Affichage du **coût estimé** et de la **latence de génération** par voix (caché tant qu'on n'a pas voté, pour éviter le biais)
- Un bouton **« Révéler »** qui dévoile quelle voix correspondait à quel provider, avec le coût réel

### 3. Lien d'accès
Ajout d'un bouton « Comparer les voix TTS » dans le menu super-admin existant (page `/admin`).

## Détail technique

- **Lovable AI Gateway** : POST sur `https://ai.gateway.lovable.dev/v1/audio/speech` avec le modèle `gemini-2.5-flash-preview-tts`, voix passée dans le body. Si l'endpoint dédié TTS n'est pas disponible côté gateway, repli sur `chat/completions` avec `modalities: ["audio"]` et extraction du contenu audio base64 de la réponse.
- **Audio renvoyé** : converti en MP3 (ou WAV selon format de sortie Gemini) et streamé tel quel au client.
- **Pas de stockage** : les audios générés ne sont pas persistés, juste joués dans le navigateur.
- **Sécurité** : la fonction `tts-gemini` exige un JWT valide ET vérifie que l'utilisateur a le rôle `super_admin` via `has_role()`.
- **Aucune migration de base de données** nécessaire.

## Fichiers touchés

- ✅ Créé : `supabase/functions/tts-gemini/index.ts`
- ✅ Créé : `src/pages/AdminTtsCompare.tsx`
- ✏️ Modifié : `src/App.tsx` (nouvelle route `/admin/tts-compare`)
- ✏️ Modifié : `src/pages/SuperAdmin.tsx` (lien d'accès)

## Hors scope (à voir après le test)

- Cartesia, OpenAI TTS, Hume → ajoutés plus tard si tu veux pousser la comparaison
- Bascule du TTS de production vers Gemini → seulement après validation à l'aveugle
- Cache TTS sur les questions de bibliothèque (autre levier d'économie déjà identifié)

Si tu valides, je passe à l'implémentation.