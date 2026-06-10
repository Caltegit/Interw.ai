## Objectif

Produire `REBUILD_SPEC.md` à la racine du projet : spécification fonctionnelle complète et fidèle au code réellement présent, destinée à reconstruire l'application sur un autre stack technique.

## Méthode d'exploration (avant écriture)

Avant de rédiger, je vais parcourir systématiquement :

1. **Routes & écrans** — `src/App.tsx` (déjà vu, ~60 routes), puis chaque fichier de `src/pages/` (≈60 pages) pour extraire URL, contrôle d'accès, contenu, actions.
2. **Composants métier** — `src/components/session/`, `src/components/project/`, `src/components/copilot/`, `src/components/interview/`, `src/components/library/`, `src/components/superadmin/`, `src/components/feedback/`, layouts.
3. **Hooks & libs** — `src/hooks/queries/`, `src/lib/` (calculs, slug, decisionAuthor, rebalanceWeights, videoComposer, etc.), `src/contexts/`.
4. **Base de données** — schéma de toutes les tables listées (35+ tables) avec colonnes, enums, contraintes, et toutes les policies RLS via `security--get_table_schema` + `supabase--read_query`.
5. **Edge functions** — listing complet de `supabase/functions/`, lecture de chaque `index.ts` pour déclencheurs, entrées, effets, IA, emails.
6. **Templates email** — lecture exhaustive de `supabase/functions/_shared/transactional-email-templates/` et `_shared/email-templates/`.
7. **Prompts IA** — extraction mot-à-mot des system prompts dans `generate-report`, `transcribe-session`, `copilot`, `ai-text-customizer`, `process-report-queue`, etc.
8. **Config** — `supabase/config.toml`, `tailwind.config.ts`, `src/index.css`, `package.json`, fichiers `.lovable/`.
9. **Jobs planifiés** — recherche `pg_cron` / `cron.schedule` dans les migrations.
10. **Storage** — buckets via schéma storage.

## Plan de rédaction de `REBUILD_SPEC.md`

Fichier unique, écrit en 2 passes pour ne rien tronquer :

**Passe 1 — Sections 1 à 6**
1. Vue d'ensemble (produit, personas recruteur/candidat/admin/superadmin, modèle économique tel qu'implémenté).
2. Inventaire exhaustif des fonctionnalités — une sous-section par feature détectée (projets, bibliothèques questions/critères/intros/templates entretien/emails, sessions candidat, transcription, génération rapport, partage rapport, comparaison candidats, stats projet, copilote IA, feedback, admin org, superadmin, impersonation, magic link, invitations, page publique projet, page publique org, highlights, export vidéo, unsubscribe…). Pour chacune : flux pas à pas, états, règles, cas limites, marquage `[INCOMPLET]` / `[À VÉRIFIER]`.
3. Carte des écrans — tableau route par route.
4. Modèle de données — table par table en langage neutre.
5. Règles d'accès — chaque policy RLS traduite en français.
6. Logique backend — chaque edge function, trigger SQL, cron.

**Passe 2 — Sections 7 à 13**
7. IA — prompts reproduits **intégralement et mot-à-mot** (generate-report, copilot, ai-text-customizer, transcription, tout autre appel détecté), modèles utilisés, schémas JSON attendus.
8. Authentification & comptes — login, magic link, invitations, reset password, rôles (superadmin / org admin / membre / candidat anonyme), suppression.
9. Fichiers & médias — buckets, types, limites, flux d'upload vidéo/audio candidat, lecture, export MP4.
10. Emails transactionnels — chaque template (déclencheur, destinataire, objet, résumé contenu).
11. Intégrations externes — IA (modèle), email (provider), TTS, Remotion vidéo, etc., avec **noms de variables d'environnement uniquement**.
12. Design & ton — indigo #6366F1, Inter, langue FR, ton.
13. Dette & trous connus — fragilités, doublons, mocks, incohérences relevés pendant l'exploration.

## Règles que je m'impose

- Lecture exclusive du code/schéma/config présents — aucune référence aux conversations passées.
- Vocabulaire agnostique : pas de mention de frameworks frontend ni de noms de librairies internes ; on garde uniquement les services externes (modèle IA nommé, fournisseur email, moteur vidéo).
- Aucune valeur de secret ni clé : uniquement les noms de variables et leur rôle.
- Aucune URL de dashboard ni identifiant interne du backend hébergé.
- Marquage explicite `[INCOMPLET]` (UI sans backend, à moitié câblé) et `[À VÉRIFIER]` (comportement non confirmé par le code lu).
- Aucune embellissement, aucune feature inventée.

## Livrable

Un seul fichier `REBUILD_SPEC.md` à la racine. Aucune autre modification de code. Sections 1–6 écrites en premier appel d'édition, sections 7–13 en second appel, sans résumer ni tronquer.

Dis-moi si tu veux ajuster le périmètre (par ex. exclure le superadmin, ou inclure les tests E2E comme source de vérité comportementale) avant que je lance l'exploration et la rédaction.
