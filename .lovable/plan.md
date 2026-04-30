# Plan : Système de feedback avec conversation

Ajouter un lien "Feedback" dans la barre latérale qui permet à chaque utilisateur d'ouvrir un fil de discussion avec le super admin. Chaque feedback crée automatiquement une conversation à laquelle les deux parties peuvent répondre.

## Comportement utilisateur

**Côté utilisateur (RH) :**
- Nouveau lien "Feedback" dans le menu latéral (sous "Paramètres")
- Liste de ses feedbacks envoyés (sujet, statut, date, dernier message)
- Bouton "Nouveau feedback" → formulaire (sujet + message initial)
- Clic sur un feedback → fil de conversation avec le super admin, possibilité de répondre

**Côté super admin :**
- Même lien "Feedback" mais voit TOUS les feedbacks de toutes les organisations
- Filtres par statut (ouvert / résolu) et par organisation
- Indicateur du nombre de feedbacks non lus
- Peut répondre, marquer comme résolu, rouvrir

## Détails techniques

### Base de données (migration)

Deux nouvelles tables :

**`feedback_threads`**
- `id` (uuid, pk)
- `user_id` (uuid) — auteur du feedback
- `organization_id` (uuid, nullable) — pour filtrage côté super admin
- `subject` (text)
- `status` (enum `feedback_status`: `open`, `resolved`)
- `created_at`, `updated_at` (timestamps)
- `last_message_at` (timestamp, pour tri)

**`feedback_messages`**
- `id` (uuid, pk)
- `thread_id` (uuid, fk → feedback_threads, on delete cascade)
- `author_id` (uuid)
- `author_role` (text: `user` ou `super_admin`)
- `content` (text)
- `read_by_recipient_at` (timestamp, nullable) — pour le badge non-lu
- `created_at`

Trigger : à chaque insert dans `feedback_messages`, mettre à jour `last_message_at` et `updated_at` du thread parent.

### RLS

**`feedback_threads`** :
- SELECT : `user_id = auth.uid()` OR `is_super_admin(auth.uid())`
- INSERT : authenticated, `user_id = auth.uid()`
- UPDATE (statut) : auteur OU super admin

**`feedback_messages`** :
- SELECT : si l'utilisateur peut voir le thread parent
- INSERT : si l'utilisateur peut voir le thread parent ; `author_id = auth.uid()`
- UPDATE (marquer comme lu) : recipient seulement

### Routes & pages

- `/feedback` — liste des fils (vue adaptée selon rôle)
- `/feedback/:threadId` — détail d'un fil avec messages et zone de réponse

Nouveaux fichiers :
- `src/pages/Feedback.tsx` (liste)
- `src/pages/FeedbackThread.tsx` (détail + conversation)
- `src/components/feedback/NewFeedbackDialog.tsx`
- `src/components/feedback/FeedbackMessageList.tsx`

Hook : `src/hooks/useUnreadFeedback.ts` pour le badge dans la sidebar.

### Sidebar (`src/components/AppSidebar.tsx`)

Ajouter une entrée "Feedback" (icône `MessageCircle` de lucide-react) dans `bottomItems`, avec un petit badge numérique si messages non lus.

### Realtime

Activer realtime sur `feedback_messages` pour rafraîchir la conversation en direct quand l'autre partie répond (le fil ouvert s'abonne au channel postgres_changes filtré par `thread_id`).

### Notifications

Pour cette V1 : pas d'email automatique, juste le badge dans la sidebar. (À confirmer si vous voulez aussi un email au super admin à chaque nouveau feedback — peut être ajouté ensuite.)

## Hors scope
- Pièces jointes / fichiers (texte uniquement)
- Notifications par email (peut être ajouté ensuite)
- Réactions / emojis
