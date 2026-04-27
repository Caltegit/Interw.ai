## Bug identifié

En analysant la base de données, j'ai trouvé la cause exacte du bug.

**Projet source** "Poylo, la dernière." : 9 questions dont **1 archivée** (supprimée depuis l'éditeur — la suppression archive au lieu de supprimer quand la question est référencée par des messages de session).

**Projet copié** "Poylo, une dernière conversation." : a hérité des 9 questions, **archivée incluse**.

### Pourquoi ça crée le bug

1. La fonction `handleDuplicate` dans `src/pages/ProjectDetail.tsx` lit les questions depuis le state `questions`, qui est chargé sans filtre `archived_at IS NULL` (ligne 82‑85). Toutes les questions, y compris les archivées, sont copiées dans le nouveau projet — mais sans recopier la valeur `archived_at`, donc elles deviennent **actives** dans la copie.
2. L'éditeur (`ProjectEdit.tsx`) filtre `archived_at IS NULL` au chargement, donc l'utilisateur ne voit pas ces questions « fantômes » dans le formulaire et ne peut pas les modifier ni les supprimer.
3. Côté candidat, `InterviewStart.tsx` ne filtre pas non plus `archived_at` lors du chargement des questions de la session, donc les anciennes questions archivées du projet d'origine sont jouées en plus des modifications faites par l'utilisateur.

### Bugs secondaires identifiés au passage

- `handleDuplicate` ne recopie pas plusieurs champs : `audio_url`, `video_url`, `hint_text`, `relance_level`, `max_response_seconds`, `scoring_criteria_ids`, `category`. Les questions audio/vidéo perdent leur média dans la copie.
- `order_index` est recopié tel quel au lieu d'être ré‑indexé proprement de 0 à N‑1.
- Les critères dupliqués perdent aussi `category` (champ existant en table).

## Correctifs à appliquer

### 1. `src/pages/ProjectDetail.tsx`

- **Charger les questions** (ligne 82‑85) avec `.is("archived_at", null)` pour ne jamais afficher ni dupliquer les questions archivées.
- **Sélectionner les colonnes manquantes** dans la requête `questions` : `audio_url, video_url, hint_text, relance_level, max_response_seconds, scoring_criteria_ids`.
- **Dans `handleDuplicate`** : recopier ces champs et ré‑indexer `order_index` de 0 à N‑1 selon l'ordre déjà trié.
- **Dans la duplication des critères** : ajouter `category`.

### 2. `src/pages/InterviewStart.tsx`

- Ajouter `.is("archived_at", null)` au chargement des questions de session (ligne ~1034) pour qu'aucune question archivée ne soit jamais jouée à un candidat.

## Résultat attendu

- Une nouvelle duplication ne copiera plus les questions archivées.
- Les questions audio/vidéo conserveront leurs médias dans la copie.
- Les questions archivées orphelines déjà présentes dans la copie existante (« Poylo, une dernière conversation. ») ne seront plus jouées au candidat (filtrage côté lecture).
- Optionnel : je peux aussi nettoyer manuellement les questions « fantômes » déjà présentes dans la copie existante pour repartir propre — dis‑moi si tu veux.