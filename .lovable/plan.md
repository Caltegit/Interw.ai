## Ajout de 24 nouveaux modèles d'entretien

Ajout de 24 sessions types pré-remplies à la bibliothèque, sur les métiers tertiaires les plus recrutés (finance, juridique, commercial, marketing, support).

### Liste des 24 métiers

**Finance & Gestion (6)**
1. Gestionnaire de paie
2. Contrôleur de gestion
3. Analyste financier
4. Chargé de recouvrement
5. Trésorier
6. Responsable budgétaire

**Juridique (4)**
7. Juriste
8. Compliance Officer
9. Assistant juridique
10. Responsable contrats

**Commercial & Relation client (6)**
11. Account Manager
12. Chargé d'affaires
13. Customer Success
14. Administration des ventes
15. Responsable grands comptes
16. Chargé de développement

**Marketing & Communication (4)**
17. Chef de projet marketing
18. Chargé de communication
19. Traffic Manager
20. Brand Content

**Coordination & Support (4)**
21. Chargé de mission
22. Coordinateur de projets
23. Assistant de direction
24. Responsable planning

### Structure de chaque modèle (identique aux 6 existants)

- **Métadonnées** : nom, description, catégorie, intitulé de poste, durée (30-35 min), langue FR
- **3 critères d'évaluation** pondérés 35/35/30 (Clarté, Motivation, Cohérence du parcours)
- **10 questions** :
  - Q0 : brise-glace ✨
  - Q1 à Q8 : questions métier ciblées (compétences techniques, mises en situation, soft skills propres au métier)
  - Q9 : mot de la fin 🎯

Ton professionnel, formulations en français soigné, follow-ups activés selon le niveau (light/medium/deep).

### Mise en œuvre technique

1. **Migration SQL** : mise à jour de la fonction `seed_default_interview_templates(_org_id, _created_by)` pour inclure les 24 nouveaux modèles en plus des 6 existants. La clause `IF EXISTS ... CONTINUE` empêche les doublons.

2. **Backfill des organisations existantes** : exécution d'une boucle qui appelle la fonction de seed pour chaque organisation déjà présente, afin que tous les comptes actuels reçoivent les nouveaux modèles immédiatement.

```sql
DO $$
DECLARE _org RECORD;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations WHERE owner_id IS NOT NULL LOOP
    PERFORM public.seed_default_interview_templates(_org.id, _org.owner_id);
  END LOOP;
END $$;
```

3. **Aucun changement front-end** : la page `Sessions` (`InterviewTemplates.tsx`) charge dynamiquement tous les modèles de l'organisation, donc les nouveaux apparaîtront automatiquement.

### Résultat attendu

Chaque organisation disposera de **30 sessions types** (6 actuelles + 24 nouvelles) directement utilisables depuis la bibliothèque, avec questions et critères prêts à l'emploi.
