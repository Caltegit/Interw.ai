## Problème

Sur 164 rapports, **106 (65%)** n'ont pas de profil Big Five (`personality_profile = null`), dont celui que tu as ouvert. Cause : dans `generate-report/index.ts`, le champ `personality_profile` est défini dans le schéma de l'outil IA mais **n'est pas marqué comme requis** (ni dans `required`, ni explicité comme obligatoire dans le prompt). Le modèle (gemini-2.5-pro) choisit donc régulièrement de l'omettre, surtout quand la transcription est courte ou que les indices sont faibles.

L'instruction actuelle dit : « Si la transcription ne permet pas de conclure, mets `confidence` à "low" » — mais elle ne dit pas explicitement « tu dois TOUJOURS produire ce bloc ».

## Plan

### 1. Rendre `personality_profile` obligatoire dans le schéma de l'outil
Dans `supabase/functions/generate-report/index.ts`, fonction `personalityProfileSchema()` :
- Ajouter `required: ["openness", "conscientiousness", "extraversion", "agreeableness", "emotional_stability"]` sur l'objet racine.
- Ajouter `required: ["score", "confidence"]` sur chaque trait (`interpretation` et `evidences` restent optionnels).

Et dans le bloc `parameters` du tool `generate_report`, ajouter `personality_profile` dans la liste `required` du niveau racine (vérifier qu'elle existe ; sinon la créer avec les champs vraiment indispensables : `verdict_headline`, `recommendation`, `decision_drivers`, `fit_breakdown`, `personality_profile`).

### 2. Renforcer le prompt
Modifier la ligne 278 du prompt système :
> « **personality_profile (Big Five) : OBLIGATOIRE.** Tu dois TOUJOURS retourner les 5 traits (openness, conscientiousness, extraversion, agreeableness, emotional_stability) avec un score 0-100 et une confidence (low/medium/high). Si la transcription est courte ou les indices faibles, mets confidence à "low" et un score neutre (~50), mais ne saute jamais ce bloc. Fournis 1-2 evidences par trait quand c'est possible. »

### 3. Filet de sécurité côté code (fallback)
Juste avant l'`insert` dans `reports` (ligne 715), si `parsed.personality_profile` est `null/undefined` ou s'il manque un trait :
- Construire un profil par défaut avec `score: 50`, `confidence: "low"`, `interpretation: "Données insuffisantes pour conclure"`, `evidences: []` pour chaque trait manquant.
- Logger un `console.warn` pour qu'on puisse suivre la fréquence dans les logs edge.

Ça garantit que **100% des nouveaux rapports** auront un Big Five affichable, même en cas de réponse IA incomplète.

### 4. Hors scope
- Ne pas régénérer les 106 rapports existants (l'utilisateur peut relancer manuellement « Régénérer le rapport » sur ceux qu'il veut).
- Pas de changement UI : `PersonalityRadar` sait déjà afficher les scores avec confidence "low".
- Pas de migration DB : la colonne `personality_profile` accepte déjà `null`.

## Ce que ça change pour toi

- Les **nouveaux rapports** auront systématiquement le radar Big Five.
- Pour le rapport `76c4a8fd…` (et les 105 autres), il faudra cliquer sur « Régénérer le rapport » dans le détail de la session pour obtenir le profil.
