

## Envoyer le rapport d'entretien par email à la fin

### Comportement

À la fin de chaque entretien (quand le rapport IA est généré), un email automatique est envoyé au recruteur (créateur du projet) avec :

- **Sujet** : `Entretien avec {nom du candidat}`
- **Reply-To** : email du candidat → cliquer "Répondre" dans la boîte mail répond directement au candidat
- **Contenu de l'email** :
  - En-tête avec nom du candidat, poste, date
  - Score global + recommandation + grade
  - Résumé exécutif
  - Points forts / Axes d'amélioration
  - Scores par critère (avec barres visuelles)
  - Bouton "Voir le rapport complet" → lien public partageable (`/shared-report/:token`)
  - **Pour les vidéos** : les emails ne supportent pas la lecture vidéo native. On affiche une vignette cliquable (poster image + bouton play) qui pointe vers le lien partagé où la vidéo est lisible. C'est la pratique standard (Loom, Vidyard, etc.).

### Étapes techniques

1. **Configuration domaine email** (prérequis Lovable Cloud)
   - L'utilisateur configure son domaine d'envoi (ex: `notify.morningrh.com`) via le dialogue de setup. C'est un step préalable obligatoire.

2. **Infrastructure email**
   - Setup de l'infra email (queue, tables, cron)
   - Scaffold du système d'envoi d'emails app
   - Template React Email `interview-report` créé dans `supabase/functions/_shared/transactional-email-templates/`

3. **Génération automatique d'un lien de partage**
   - Modifier `supabase/functions/generate-report/index.ts` pour : 
     - Créer automatiquement une entrée dans `report_shares` (token unique) quand le rapport est généré
     - Récupérer l'email du recruteur (`projects.created_by` → `profiles.email`)
     - Récupérer l'URL du site (depuis l'origin de la requête, ou variable env)
     - Invoquer `send-transactional-email` avec :
       - `templateName: 'interview-report'`
       - `recipientEmail`: email du recruteur
       - `replyTo`: email du candidat (à passer dans `templateData`, l'edge function `send-transactional-email` doit supporter ce champ)
       - `templateData`: { candidateName, candidateEmail, jobTitle, score, recommendation, summary, strengths, improvements, criteriaScores, sharedReportUrl, videoThumbnailUrl }
       - `idempotencyKey`: `interview-report-${session_id}`

4. **Template React Email** (`interview-report.tsx`)
   - Header centré avec nom candidat, poste, date
   - Carte avec score circulaire (image SVG inline ou texte stylé) + badge recommandation
   - Sections : résumé, points forts (✓ verts), axes d'amélioration (⚠ orange)
   - Tableau des critères avec barres de progression (en HTML/CSS inline compatible email)
   - Si vidéo : vignette cliquable (image avec bouton play overlay) → lien vers `/shared-report/:token`
   - Bouton CTA principal "Voir le rapport complet et la vidéo"
   - Couleurs brand : indigo `#6366F1`

5. **Reply-To dynamique**
   - Vérifier/adapter `send-transactional-email` pour accepter un champ `replyTo` dans le body et l'inclure dans l'envoi à l'API email Lovable.

### Limitations à connaître (à dire au user)

- **Vidéo dans l'email** : impossible d'embarquer une vidéo lisible directement (limitation universelle des clients mail Gmail/Outlook/Apple). Solution : vignette cliquable → lecture sur la page de rapport partagé. C'est la pratique standard.
- **Domaine d'envoi** : tu dois configurer un domaine (ex `notify.morningrh.com`) une seule fois. Sans ça, pas d'envoi possible.

### Hors scope

- Pas d'envoi au candidat (uniquement au recruteur). Ajoutable ensuite si besoin.
- Pas de personnalisation par utilisateur du template.

