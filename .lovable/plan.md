## Réordonner les statuts de la catégorie « Sélection »

Nouvel ordre demandé : **À traiter → Non → À discuter → Retenu → En cours**

### Fichiers à modifier

**1. `src/pages/ProjectDetail.tsx`**
- `DECISION_KEYS` (l. 153) → `["none", "rejected", "second_opinion", "shortlisted", "in_progress"]`
- `DEFAULT_VISIBLE_DECISIONS` (l. 154) → même ordre
- `decisionOptions` (l. 535-540) : réordonner les entrées dans le même ordre

**2. `src/components/project/SessionCard.tsx` (l. 409-412)**
Réordonner les boutons : Non → À discuter → Retenu → En cours

**3. `src/components/session/DecisionBanner.tsx`**
- `decisionConfig` (l. 70-73) : réordonner les clés
- Bloc des `DecisionButton` (l. 152-189) : réordonner dans Non / À discuter / Retenu / En cours

### Hors périmètre
- Pas de changement de design, libellés, couleurs, ni de la base de données.
- Le type `RecruiterDecision` n'est pas modifié (l'ordre des unions n'a pas d'impact UI).