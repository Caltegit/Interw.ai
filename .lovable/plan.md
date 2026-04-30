# Améliorations du module Feedback

## 1) Photo dans le formulaire de création

Ajout d'un champ optionnel "Image" dans `NewFeedbackDialog` (drag & drop ou clic) :
- Aperçu avant envoi avec bouton "Retirer"
- Upload vers un bucket public `feedback-attachments`
- L'URL est insérée dans le premier message comme image (rendu inline dans le fil)
- Plusieurs images possibles ? **Une seule** pour rester simple (modifiable plus tard)
- Formats acceptés : JPG, PNG, WEBP. Limite 5 Mo

Le rendu dans `FeedbackThread` détectera les URLs d'image et les affichera en miniature cliquable (ouverture pleine taille).

## 2) Trois statuts avec couleurs (super admin uniquement)

Évolution de l'enum `feedback_status` :
- `open` (existant) → renommé visuellement en **Nouveau** (vert)
- `in_progress` (nouveau) → **En cours** (orange)
- `archived` (nouveau, remplace `resolved`) → **Archivé** (rouge/gris)

Migration des valeurs existantes : `resolved` → `archived`.

**Côté super admin** : un `Select` (dropdown) à côté du titre pour changer le statut, avec pastille colorée.

**Côté utilisateur** : seulement un badge en lecture (mêmes couleurs et libellés).

Affichage des couleurs sur la liste `Feedback.tsx` aussi (badge coloré pour chaque thread).

## 3) Suppression côté super admin

Bouton "Supprimer" (icône poubelle) dans `FeedbackThread` visible uniquement si `isSuperAdmin`, avec `AlertDialog` de confirmation.
- Supprime le thread (cascade implicite : on supprime d'abord les `feedback_messages` du thread, puis le `feedback_thread`)
- Redirection vers `/feedback` après suppression
- Ajout d'une policy RLS `DELETE` sur `feedback_messages` pour les super admins (actuellement absente, seul DELETE possible aujourd'hui est pour l'auteur du thread)

## 4) Super admin peut créer un feedback pour lui-même

Le bouton "Nouveau feedback" devient visible aussi pour les super admins dans `Feedback.tsx`.
Aucun changement de logique : les RLS actuelles autorisent déjà tout utilisateur authentifié à créer un thread où `user_id = auth.uid()`.

## Détails techniques

### Migration SQL
```sql
-- Nouveaux statuts
ALTER TYPE feedback_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE feedback_status ADD VALUE IF NOT EXISTS 'archived';
-- Migration des resolved existants (dans une 2e migration ou via UPDATE)
UPDATE feedback_threads SET status = 'archived' WHERE status = 'resolved';

-- Bucket storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-attachments', 'feedback-attachments', true);

-- Policies storage : auth users peuvent uploader, lecture publique
CREATE POLICY "Auth can upload feedback attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feedback-attachments');

CREATE POLICY "Public can read feedback attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'feedback-attachments');

-- RLS DELETE pour super admins sur threads et messages
CREATE POLICY "Super admins can delete feedback messages"
ON feedback_messages FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()));
-- (Threads déjà couvert par "Author or super admin delete threads")
```

### Mapping couleurs (design tokens)

```text
Nouveau     → bg-success/15 text-success     (vert)
En cours    → bg-warning/15 text-warning     (orange)  
Archivé     → bg-destructive/15 text-destructive (rouge)
```

### Fichiers modifiés / créés
- `supabase/migrations/<new>.sql` — enum + bucket + policies
- `src/components/feedback/NewFeedbackDialog.tsx` — upload image
- `src/components/feedback/FeedbackStatusBadge.tsx` *(nouveau)* — badge coloré réutilisable
- `src/components/feedback/FeedbackStatusSelect.tsx` *(nouveau)* — dropdown super admin
- `src/pages/Feedback.tsx` — bouton accessible aux super admins, badge coloré
- `src/pages/FeedbackThread.tsx` — dropdown statut, bouton supprimer, rendu image dans messages

### Notes
- `feedback-attachments` est public : les URLs sont devinables uniquement via UUID, acceptable pour ce cas d'usage. Si tu veux des URLs signées privées, dis-le.
- Les anciens threads `resolved` deviennent `archived` automatiquement.
- L'enum garde `open` et `resolved` techniquement (Postgres ne supprime pas facilement des valeurs d'enum), mais `resolved` ne sera plus utilisé.
