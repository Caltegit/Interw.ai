# Importer les candidats VideoAsk dans un poste Interw

## Objectif
Permettre à Tango (et aux autres organisations) de réimporter dans Interw les candidats ayant déjà passé un entretien VideoAsk, avec leurs coordonnées et leurs vidéos/audio, pour les scorer sans renvoyer d’invitation.

## Réponse à la question initiale : quel format choisir ?

Pour récupérer les coordonnées (nom, prénom, email, téléphone) + les liens des médias, choisir **CSV file** ou **XLSX file** de VideoAsk. Les deux contiennent les réponses et les liens média.

- **CSV file** : plus léger, plus universel, mais peut coincer sur les caractères spéciaux, les retours à la ligne ou les virgules dans les réponses libres.
- **XLSX file** : plus robuste pour les caractères spéciaux et les cellules multilignes. C’est le format recommandé.

Les options **Media files** et **All data** sont des archives ZIP contenant les fichiers vidéo/audio. Elles ne contiennent pas les coordonnées structurées. Elles pourront servir plus tard si VideoAsk ne fournit pas de liens de téléchargement durables dans le CSV/XLSX, ou si tu veux importer les fichiers directement plutôt que les rapatrier par URL.

**Recommandation** : exporter en **XLSX file** d’abord. Si les liens médias sont expirants ou absents, on complétera avec l’archive ZIP **Media files** ou **All data**.

## Étapes du plan

### 1. Bouton d’import sur la page d’un poste
Ajouter un bouton « Importer des candidats » dans `ProjectDetail.tsx`, à côté des actions existantes (envoi d’emails, partage de liens).

### 2. Dialogue d’upload CSV/XLSX
Créer un composant `ImportCandidatesDialog.tsx` :
- glisser-déposer ou sélection de fichier ;
- accepte `.csv` et `.xlsx` ;
- limite de taille (ex. 10 Mo pour le tableur, séparé pour les médias) ;
- lecture côté client via une librairie légère (`xlsx` ou `papaparse`) pour prévisualiser les 5 premières lignes.

### 3. Mapping des colonnes
Afficher un écran de mapping après l’upload :
- Prénom
- Nom
- Email
- Téléphone (facultatif)
- URL de la vidéo (facultatif)
- URL de l’audio (facultatif)

Le mapping sera mémorisé pour l’organisation afin de ne pas le refaire à chaque import.

### 4. Création des fiches candidats
Pour chaque ligne validée :
- créer une ligne dans `public.sessions` liée au poste (`project_id`) et à l’organisation (`organization_id`) ;
- statut : `pending` (pas d’invitation envoyée) ;
- `candidate_name`, `candidate_email`, `candidate_phone` renseignés.

### 5. Récupération des médias
Deux chemins selon ce que VideoAsk fournit :
- **Si le XLSX contient des URLs durables** : une edge function télécharge les fichiers vidéo/audio et les stocke dans le bucket de stockage Interw, puis met à jour `video_recording_url` / `audio_recording_url`.
- **Si les URLs manquent ou expirent** : l’utilisateur uploade aussi l’archive ZIP Media files/All data ; on fait correspondre les fichiers aux candidats par nom ou par identifiant VideoAsk présent dans le XLSX.

### 6. Transcription et scoring
Une fois les médias stockés :
- lancer la transcription pour la session ;
- une fois la transcription terminée, enfiler un `report_jobs` pour générer la matrice et le rapport avec les critères du poste ;
- ne pas envoyer d’email de remerciement automatique (contrairement au parcours candidat classique).

### 7. Gestion des doublons et erreurs
- détecter les doublons par email dans le même poste ;
- proposer d’ignorer, de mettre à jour ou de créer une nouvelle session ;
- afficher un récapitulatif à la fin : importées, en échec, doublons, médias en attente.

### 8. Suivi de l’import
Ajouter une table `candidate_imports` ou utiliser `session_attempts` / un champ JSONB pour tracer :
- date de l’import ;
- fichier source ;
- nombre de lignes ;
- statut par ligne.

Cela permettra de relancer le scoring ou de diagnostiquer un import.

## Détails techniques

### Base de données
Aucune migration obligatoire si on réutilise `sessions` avec `status = 'pending'` et les champs existants (`candidate_name`, `candidate_email`, `candidate_phone`, `video_recording_url`, `audio_recording_url`).

Optionnel : créer une table `candidate_import_batches` pour tracer les lots.

```sql
CREATE TABLE public.candidate_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_filename text,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.candidate_import_batches TO authenticated;
GRANT ALL ON public.candidate_import_batches TO service_role;
ALTER TABLE public.candidate_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read their imports" ON public.candidate_import_batches FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can create imports" ON public.candidate_import_batches FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can update their imports" ON public.candidate_import_batches FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), organization_id));
```

### Stockage
Utiliser le bucket existant des enregistrements (`session-recordings` ou équivalent) avec un chemin `imports/<batch_id>/<session_id>/video.mp4`.

### Edge functions
Créer deux fonctions :
1. `import-candidates` : reçoit les lignes mappées, crée les sessions et retourne les IDs.
2. `import-candidate-media` : télécharge un fichier média depuis une URL externe ou reçoit un fichier ZIP, stocke dans le bucket et met à jour la session.

### Permissions
Vérifier que l’utilisateur a accès au poste (`has_project_access`).

### Interface
- Le dialogue doit rester simple : upload, mapping, confirmation, récap.
- Pas de logique d’envoi d’email intégrée (conformément au choix : pas d’invitation automatique).

## Questions restantes

1. **Colonne téléphone dans VideoAsk** : l’export contient-il une colonne "phone", "telephone", "mobile" ou un champ personnalisé ? L’écran de mapping le résoudra, mais il serait utile de savoir si elle est systématiquement présente.

2. **Liens médias dans le XLSX** : les colonnes du fichier VideoAsk incluent-elles directement des URLs publiques de téléchargement des vidéos/audio, ou faut-il obligatoirement uploader l’archive ZIP ?

3. **Score / statut final** : une fois importés et scorés, ces candidats doivent-ils apparaître comme des sessions `completed` (entretien terminé) ou rester en `pending` avec un traitement manuel ? Le plan propose `pending` pour ne pas déclencher automatiquement les emails de fin de parcours, mais on peut basculer en `completed` si les médias et le rapport sont présents.
