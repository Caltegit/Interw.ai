# Deux failles confirmées : données candidats et enregistrements accessibles sans compte

## Ce que j'ai vérifié à l'instant

Les deux alertes sont réelles, je les ai reproduites sur la base de production.

**1. La liste des candidats est lisible publiquement.** Avec la seule clé publique du site, une simple requête renvoie nom, adresse e-mail, téléphone et jeton d'entretien de candidats réels (j'ai obtenu Rose Riglet, Catherina Smayra…), ainsi que le contenu des échanges d'entretien. Le filtre par jeton existe uniquement dans le navigateur, donc contournable.

**2. Les enregistrements vidéo sont téléchargeables sans authentification.** La vidéo d'entretien de Julie Safari se télécharge directement par son adresse, sans compte. L'espace de stockage est marqué public et 789 sessions y stockent des adresses absolues de ce type.

C'est une exposition de données personnelles (RGPD). Les deux corrections sont à faire, dans cet ordre, avec une vérification entre les deux.

## Lot 1 — Fermer l'accès aux données candidats (le plus urgent)

Le contrôle du jeton passe du navigateur à la base de données.

- Créer des fonctions serveur qui prennent le jeton en paramètre et ne renvoient que la session correspondante, sans les champs réservés au recruteur (note, décision, jeton).
- Une fonction d'écriture à liste blanche stricte : le candidat ne peut modifier que l'avancement de son entretien, jamais une note ou une décision.
- Une fonction de création de session depuis la page publique de poste, qui déduit le poste et l'organisation côté serveur.
- Supprimer ensuite les autorisations anonymes actuelles sur les sessions et les messages, et retirer aussi les privilèges de table (sans quoi la fermeture serait illusoire).
- Adapter le parcours candidat (page publique, test matériel, entretien, reprise, fin) pour appeler ces fonctions.

Rien ne change pour les recruteurs : leurs accès restent intacts.

## Lot 2 — Sortir les enregistrements du stockage public

- Nouvel espace de stockage privé réservé aux enregistrements d'entretien, accessible seulement par le serveur.
- Une fonction qui délivre un lien temporaire (1 h) après avoir vérifié que le demandeur a droit à cette session : jeton candidat valide, membre de l'organisation, ou super administrateur.
- Déplacement par lots des fichiers existants, reprenable sans tout rejouer.
- Les adresses enregistrées deviennent des chemins ; la lecture accepte les deux formats pendant la transition, donc les anciennes fiches continuent de fonctionner.
- Les images publiques légitimes (logos, avatars, vidéos de question, pages publiques) restent où elles sont : rien de visible côté vitrine ne bouge.

## Détails techniques

**Lot 1**
- Fonctions `SECURITY DEFINER`, `SET search_path = public`, `REVOKE EXECUTE FROM PUBLIC` puis `GRANT EXECUTE TO anon` : `candidate_get_session`, `candidate_get_project`, `candidate_update_session(_patch jsonb)`, `candidate_list_messages`, `candidate_insert_message`, `candidate_reset_messages`, `public_start_session`.
- Liste blanche d'écriture : `status`, `started_at`, `completed_at`, `last_activity_at`, `last_question_index`, `consent_given_at`, `consent_accepted_at`, `duration_seconds`, `end_reason`, `video_recording_url`, `audio_recording_url`, `thumbnail_url`.
- `DROP POLICY` des 6 politiques anon sur `sessions` / `session_messages`, puis `REVOKE ALL ... FROM anon` (vérifié : `has_table_privilege('anon','sessions','SELECT') = true` aujourd'hui). Politiques `authenticated` inchangées.
- Front : `InterviewStart.tsx`, `InterviewLanding.tsx`, `InterviewDeviceTest.tsx`. Aucun découpage de fichier, aucune refonte.
- Points de vigilance : mode démo (`is_demo`, routes `/session/:slug/demo`), reprise d'entretien (`handleResumeInterview` doit lire via la RPC), `session_attempts` laissé en l'état et documenté.

**Lot 2**
- Bucket `interview-recordings` (`public = false`), aucune policy `anon`/`authenticated`.
- Edge function `get-interview-media-url` (`verify_jwt = false`), entrée `{ path }` + jeton candidat ou `Authorization: Bearer`, résolution obligatoire du `sessionId` avant signature, `createSignedUrl(path, 3600)`, réutilisation de `_shared/auth-guard.ts` et `SHARED_CORS`.
- Côté serveur, remplacer les `fetch()` sur URL publique par `storage.from("interview-recordings").download(path)` dans : `transcribe-session`, `analyze-nonverbal`, `analyze-paraverbal`, `generate-report`, `repair-session-media` (parse `object/public/media/` ligne ~57), `recover-session-video`, `store-repaired-video` (reconstruit une URL publique ligne ~116), `import-external-candidates`, `purge-old-videos`.
- Côté front, une seule résolution centralisée (un hook) consommée par `SessionVideoNavigator`, `SessionClipPlayer`, `SessionVideoThumb`, `HighlightReelPlayer`, `SessionVideoExport`, `useMp4Download`, `HighlightsPublic`.
- Migration de données sur `sessions.video_recording_url` / `audio_recording_url` / `thumbnail_url` (789 lignes en URL absolue) et sur les colonnes média de `session_messages`.

## Vérifications avant de considérer chaque lot terminé

1. Avec la clé publique seule, la requête sur les sessions et sur les messages ne renvoie plus rien.
2. Un jeton inexistant ne renvoie rien ; un patch contenant une décision recruteur est refusé.
3. L'adresse publique d'un enregistrement renvoie 400/404 au lieu de 200.
4. Parcours candidat complet en navigateur de test : page publique → test matériel → entretien → interruption et reprise → fin → rapport généré.
5. Back-office recruteur, page publique de poste, avatars et vidéos de question inchangés.

## Question de conformité

Avant déploiement, il est utile de consulter les journaux d'accès pour estimer l'exposition passée : cette information conditionne une éventuelle notification CNIL et devient difficile à reconstituer après correction.
