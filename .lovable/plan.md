## Cause

Lors de l'enregistrement d'un projet existant, l'écran "Modifier le projet" tente de ré-uploader l'avatar (et l'audio/vidéo d'intro) avec `upsert: true` sur le bucket `media`. Quand le fichier existe déjà, Supabase Storage exécute un UPDATE sur `storage.objects`. Or les politiques actuelles n'autorisent que **INSERT** et **SELECT** sur `media` — il n'y a **aucune politique UPDATE** (sauf pour `org-logos/`). Résultat : `new row violates row-level security policy (USING expression) for table "objects"`.

Confirmé par les logs Postgres : ~20 erreurs RLS sur `storage.objects` côté upsert.

## Correctif

Migration SQL : ajouter deux politiques sur `storage.objects` pour le bucket `media`, alignées sur les politiques INSERT existantes (membres org authentifiés) :

```text
- UPDATE  on storage.objects  WHERE bucket_id = 'media'
  USING       : auth.uid() IS NOT NULL
  WITH CHECK  : bucket_id = 'media'

- DELETE  on storage.objects  WHERE bucket_id = 'media'
  USING       : auth.uid() IS NOT NULL
```

Pourquoi `auth.uid() IS NOT NULL` et pas un check d'org : la politique INSERT actuelle (`Org members can upload media`) est elle aussi sans contrainte d'org (`with_check: bucket_id = 'media'`). On reste cohérent — on ne durcit pas dans le même patch pour ne pas casser d'autres flux (questions, réponses candidats, etc.). On exige seulement d'être authentifié, donc les anonymes ne peuvent pas modifier/supprimer (sécurité réelle gagnée vs aujourd'hui où seul l'INSERT anon est ouvert via la politique "Anon can upload media").

## Fichiers

- 1 migration SQL (aucun changement de code applicatif).

## Hors scope

- Restriction fine "seul le propriétaire/org peut écraser son fichier" : à traiter dans un patch sécurité dédié, après audit de tous les chemins d'upload candidat.
- La politique anonyme `Anon can upload media` reste en place (utilisée par les sessions candidats publics).
