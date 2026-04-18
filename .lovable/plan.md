

## Plan : Email automatique au recruteur après chaque entretien

### Objectif
Quand un candidat termine son entretien et que le rapport IA est généré, envoyer automatiquement un email au recruteur (créateur du projet) avec le contenu complet du rapport + lien vers le rapport en ligne, avec le `Reply-To` configuré sur l'email du candidat.

### Flux technique

```
Candidat termine entretien
    ↓
generate-report (déjà existant) crée le rapport
    ↓
[NOUVEAU] À la fin de generate-report, on appelle send-transactional-email
    ↓
Template "interview-report" est rendu avec toutes les données
    ↓
Email envoyé à recruiter.email (créateur du projet) avec Reply-To = candidat
```

### Étapes d'implémentation

**1. Vérifier l'infra emails transactionnels**
- `setup_email_infra` semble OK (tables présentes : `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`, `email_send_state`)
- Mais `send-transactional-email` Edge Function existe déjà ✓
- Le registry `_shared/transactional-email-templates/registry.ts` est vide → pas encore de templates transactionnels scaffoldés

→ Exécuter `email_domain--scaffold_transactional_email` pour créer proprement `handle-email-unsubscribe`, `handle-email-suppression`, et la page unsubscribe associée.

**2. Créer le template `interview-report.tsx`**
Composant React Email avec props :
- `candidateName`, `candidateEmail`, `jobTitle`, `projectTitle`
- `overallScore`, `overallGrade`, `recommendation`, `executiveSummary`
- `strengths[]`, `areasForImprovement[]`
- `criteriaScores` (label / score / max / comment)
- `questionEvaluations` (question / score / comment)
- `reportUrl` (lien vers `/sessions/:id` côté app)

Sujet : `interw.ai - {candidateName}`

Background blanc, accents indigo (#6366F1), boutons CTA "Voir le rapport complet".

**3. Enregistrer dans `registry.ts`**
Ajouter l'import + entrée `'interview-report'`.

**4. Support du `Reply-To`**
`send-transactional-email` actuel ne gère pas `replyTo`. Il faut :
- Ajouter un champ optionnel `replyTo` au body
- Le passer dans le payload `enqueue_email`
- Vérifier que `process-email-queue` le forwarde à l'API d'envoi (s'il ne le fait pas, l'ajouter aussi)

**5. Trigger automatique dans `generate-report`**
À la toute fin de `generate-report/index.ts`, après le succès de l'insert du rapport :
- Récupérer le créateur du projet : `projects.created_by` → `profiles.email` (ou `auth.users.email` via service role)
- Construire l'URL du rapport : `https://interw.ai/sessions/{session_id}` (ou domaine de prod)
- Invoquer `send-transactional-email` avec :
  ```
  templateName: 'interview-report'
  recipientEmail: <email recruteur>
  replyTo: session.candidate_email
  idempotencyKey: `report-${session_id}`
  templateData: { ...toutes les données du rapport... }
  ```

**6. Redéployer**
- `send-transactional-email` (modifié pour replyTo)
- `process-email-queue` (modifié si besoin pour replyTo)
- `handle-email-unsubscribe`, `handle-email-suppression` (scaffoldés)
- `generate-report` (modifié)

**7. Page Unsubscribe**
Créer la page React au chemin déterminé par le scaffold (ex `/unsubscribe`) + ajouter la route dans `App.tsx`.

### Test final
Lancer un vrai entretien de bout en bout, vérifier que :
- Le rapport est généré
- Un email arrive sur l'adresse du créateur du projet
- L'objet contient bien `interw.ai - {nom candidat}`
- Cliquer "Répondre" cible bien l'email du candidat
- Les sections du rapport sont toutes présentes et lisibles

### Notes
- L'email part depuis `noreply@notify.interw.ai` (domaine vérifié), Reply-To pointera sur le candidat → expérience naturelle pour le recruteur
- Idempotency key basé sur `session_id` → pas de doublon si `generate-report` est rejoué

