
## Plan : Consentement RGPD renforcé + droit d'annulation totale

### 1. Migration de base de données
Ajouter à la table `sessions` :
- `consent_accepted_at` (timestamp, nullable) — traçabilité légale du consentement
- `cancelled_at` (timestamp, nullable) — horodatage de l'annulation totale

Ajouter la valeur `'cancelled'` à l'enum `session_status` (utilisée brièvement avant la suppression complète, pour éviter les conflits si la suppression échoue partiellement).

### 2. Nouveau composant : popup conditions RGPD
Créer `src/components/interview/ConsentDialog.tsx` :
- Dialog scrollable, sections claires en français
- 8 sections : données collectées, finalité, accès, durée, droits RGPD, analyse IA, **droit de retrait avec suppression totale**, contact
- Variables dynamiques injectées : `{job_title}`, `{org_name}`
- Bouton « J'ai compris » qui ferme le popup

### 3. Intégration consentement sur la page test technique
Modifier `src/pages/InterviewDeviceTest.tsx` :
- Ajouter une `Checkbox` obligatoire juste avant le bouton « Commencer la session »
- Texte : *« J'ai lu et j'accepte les conditions de traitement de mes données personnelles. »*
- Lien « Lire les conditions » qui ouvre le `ConsentDialog`
- Bouton « Commencer la session » désactivé tant que la case n'est pas cochée
- Au clic sur « Commencer », mettre à jour `consent_accepted_at` sur la session

### 4. Nouvelle edge function : `cancel-session`
Créer `supabase/functions/cancel-session/index.ts` (verify_jwt = false, route candidat publique) :
- Accepte `{ sessionToken }`
- Vérifie que la session existe et n'est pas déjà terminée
- Liste et supprime tous les fichiers du bucket storage liés à la session (audio + vidéo segments)
- Supprime en cascade : `transcripts`, `session_messages`, `reports` (si existant), puis `sessions`
- Retourne confirmation

### 5. Popup d'annulation pendant l'entretien
Modifier la page de session active (probablement `InterviewSession.tsx` ou équivalent) :
- Quand le candidat clique sur le bouton actuel « Mettre fin à la session », ouvrir un `AlertDialog` avec **2 choix** :
  - ✅ **« Terminer et envoyer mes réponses »** → comportement actuel (génération du rapport)
  - 🗑️ **« Annuler et tout supprimer »** → seconde confirmation puis appel à `cancel-session`
- Après suppression : redirection vers une nouvelle page `/session/cancelled`

### 6. Page de confirmation d'annulation
Créer `src/pages/InterviewCancelled.tsx` :
- Message rassurant : *« Votre entretien a été annulé. Toutes vos données ont été définitivement supprimées. »*
- Pas de retour vers le projet possible (session détruite)

### 7. Vérifications
- Tester le flux complet consentement → entretien → annulation
- Vérifier que les fichiers storage sont bien supprimés (logs edge function)
- Vérifier qu'aucune trace ne reste côté recruteur après annulation
- Vérifier la mention RGPD du consentement persistée pour traçabilité légale (avant suppression de la session)

### ⚠️ Hors scope
- Personnalisation par organisation (texte standard pour tous, validé)
- Email DPO personnalisable (validé : standard)
- Email de double opt-in (validé : non)
- Annulation par le recruteur (déjà géré par les politiques de suppression existantes)
