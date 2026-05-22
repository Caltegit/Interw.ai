## Avertissement RGPD + expiration 10 jours sur "Partager les rapports"

Fichier : `src/components/project/ShareReportsDialog.tsx`

1. **Expiration 10 jours** sur les nouveaux liens créés ici, comme dans le dialog de partage individuel : ajouter `expires_at: new Date(Date.now() + 10 * 86400000).toISOString()` à l'insert ligne 86. Les liens existants restent inchangés.

2. **Encadré d'avertissement** ajouté juste avant `<DialogFooter>` (après le bloc Message) :
   - Style : `rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-foreground` avec icône `AlertTriangle` (déjà dispo dans lucide-react).
   - Contenu :
     - « Ces liens expirent automatiquement après 10 jours. »
     - « Conformité RGPD : ne rendez jamais ces rapports publics. Partagez ce message uniquement avec les personnes strictement nécessaires à la décision de recrutement (équipe RH, manager). Les candidats n'ont pas consenti à une diffusion plus large. »

Aucune autre modification, aucune migration.
