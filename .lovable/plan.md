

## Projet de démo pré-chargé à la création de compte

À chaque création d'un nouveau compte (= nouvelle organisation), créer automatiquement un projet **« Candidature spontanée »** prêt à l'emploi pour que l'utilisateur ait immédiatement quelque chose à explorer dans l'onglet `Sessions`.

### Contenu du projet créé

- **Titre** : Candidature spontanée
- **Job title** : Candidature spontanée
- **Statut** : `active`
- **Langue** : `fr`
- **Avatar** : avatar par défaut (femme)
- **Voix** : voix féminine FR par défaut (`tts_provider = elevenlabs`, `tts_voice_gender = female`, `tts_voice_id` voix par défaut)
- **Persona** : Marie

**Intro** :
- `intro_enabled = true`
- `intro_mode = 'tts'` (texte lu par l'IA)
- `intro_text` :
  > Bienvenue dans cette session de test pour comprendre comment fonctionne Interw.ai. Voici le message de bienvenue que vous pouvez customiser. À suivre, 5 questions lues par l'IA.

**5 questions** (toutes en mode texte lu par l'IA → `type = 'written'`, follow-up activé, `relance_level = 'medium'`) :
1. Comment ça va aujourd'hui ?
2. Parlez-moi de votre dernière expérience professionnelle en quelques minutes. C'est à vous.
3. Pourquoi avoir choisi notre entreprise, qu'est-ce qui vous motive à nous rejoindre ?
4. Que faites-vous en dehors du travail ? À quoi occupez-vous votre temps libre ?
5. Un dernier mot avant qu'on se quitte ?

**Critères d'évaluation** : on **ne crée pas** de critères propres au projet — on s'appuie sur la bibliothèque par défaut (`criteria_templates`) déjà seedée par `seed_default_criteria_templates`. L'utilisateur pourra les importer depuis la bibliothèque s'il le souhaite. *(Note : le wizard projet permet de cloner depuis la bibliothèque, donc « garder les critères de base » = bibliothèque déjà seedée.)*

> Si tu préfères que les 10 critères de base soient aussi **directement injectés dans le projet de démo** (pour qu'ils apparaissent dans l'onglet Critères du projet sans action de l'utilisateur), dis-le moi et je l'ajoute.

### Modifications base de données

Migration ajoutant **une nouvelle fonction PL/pgSQL** :

```sql
CREATE OR REPLACE FUNCTION public.seed_demo_project(_org_id uuid, _created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _project_id uuid;
BEGIN
  -- Idempotent : ne rien faire si un projet "Candidature spontanée" existe déjà pour cette org
  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE organization_id = _org_id AND title = 'Candidature spontanée'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.projects (
    organization_id, created_by, title, job_title, description, status, language,
    ai_persona_name, ai_voice, tts_provider, tts_voice_gender, tts_voice_id,
    max_duration_minutes, record_audio, record_video,
    intro_enabled, intro_mode, intro_text,
    completion_message, slug
  ) VALUES (
    _org_id, _created_by, 'Candidature spontanée', 'Candidature spontanée',
    'Projet de démo pré-rempli pour découvrir Interw.ai.',
    'active', 'fr', 'Marie', 'female_fr', 'elevenlabs', 'female', 'XB0fDUnXU5powFXDhCwa',
    30, true, false,
    true, 'tts',
    'Bienvenue dans cette session de test pour comprendre comment fonctionne Interw.ai. Voici le message de bienvenue que vous pouvez customiser. À suivre, 5 questions lues par l''IA.',
    'Merci pour votre temps ! Votre session est terminée.',
    'candidature-spontanee-' || substr(md5(random()::text || _org_id::text), 1, 8)
  ) RETURNING id INTO _project_id;

  INSERT INTO public.questions (project_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level)
  VALUES
    (_project_id, 0, 'Bien-être', 'Comment ça va aujourd''hui ?', 'open', true, 1, 'light'),
    (_project_id, 1, 'Dernière expérience', 'Parlez-moi de votre dernière expérience professionnelle en quelques minutes. C''est à vous.', 'open', true, 2, 'medium'),
    (_project_id, 2, 'Motivation', 'Pourquoi avoir choisi notre entreprise, qu''est-ce qui vous motive à nous rejoindre ?', 'open', true, 2, 'medium'),
    (_project_id, 3, 'Hors travail', 'Que faites-vous en dehors du travail ? À quoi occupez-vous votre temps libre ?', 'open', true, 1, 'light'),
    (_project_id, 4, 'Mot de la fin', 'Un dernier mot avant qu''on se quitte ?', 'open', true, 1, 'light');
END;
$$;
```

Et **brancher cette fonction** aux deux entrypoints existants :

- `accept_invitation(_token, _user_id)` : ajouter `PERFORM public.seed_demo_project(_org_id, _user_id);` juste après les autres seeds, dans la branche `_current_owner IS NULL` (= premier owner).
- `trg_seed_on_owner_set()` : ajouter `PERFORM public.seed_demo_project(NEW.id, NEW.owner_id);` après les autres seeds.

L'idempotence interne (test `IF EXISTS`) garantit qu'on ne crée pas de doublon si la fonction est appelée plusieurs fois.

### Backfill (optionnel)

À la fin de la migration, on appelle `seed_demo_project` pour toutes les organisations existantes ayant un `owner_id`, pour que les comptes déjà créés profitent aussi du projet de démo :

```sql
DO $$ DECLARE _org RECORD;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations WHERE owner_id IS NOT NULL LOOP
    PERFORM public.seed_demo_project(_org.id, _org.owner_id);
  END LOOP;
END $$;
```

### Pas besoin de session pré-créée

L'onglet « Sessions » de l'app affiche les sessions des projets de l'utilisateur. Avoir un projet actif suffit : l'utilisateur peut générer son lien candidat et tester l'expérience tout de suite. *(Si tu veux en plus une **session de démo factice** déjà visible dans la liste, dis-le moi — il faudra alors aussi insérer une ligne dans `sessions` + éventuellement quelques `session_messages` factices.)*

### Fichiers touchés

- **Créé** : 1 nouvelle migration `seed_demo_project_on_signup.sql`
- **Aucun changement front** : la fonction tourne en base, le projet apparaît automatiquement quand l'utilisateur arrive sur `/projects` ou `/sessions`.

### Hors champ

- Pas de modification du flux de signup côté front.
- Pas de critères propres au projet de démo (s'appuie sur la bibliothèque déjà seedée).
- Pas de session candidat factice pré-jouée.

