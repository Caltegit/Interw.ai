## Objectif

Dans la vignette candidat (composant `SessionCard`, vue Cartes), remplacer la rangée de 5 boutons de décision (Non / À discuter / Retenu / En cours / Oui) par un **menu déroulant unique**, centré, placé juste sous la ligne « Précédent / vitesse / Suivant ».

## Comportement

- Un seul `Select` shadcn affichant la décision courante (libellé + petite pastille de couleur correspondant au ton actuel : destructive, warning, success, info, success-strong).
- Options proposées (dans l'ordre) :
  - « Aucune » (valeur `none`)
  - « Non » (`rejected`)
  - « À discuter » (`second_opinion`)
  - « Retenu » (`shortlisted`)
  - « En cours » (`in_progress`)
  - « Oui » (`accepted`)
- Le `SelectTrigger` est centré horizontalement, largeur auto (mini ~12rem), et adopte la couleur de fond de la décision active (mêmes tokens que les boutons actuels). Quand `none`, apparence neutre (`outline`).
- Tooltip sur le trigger : affiche `authorTooltip` (auteur + date) lorsqu'une décision est définie, comme aujourd'hui.
- Changer d'option appelle `onDecisionChange(session.id, value)`. Sélectionner « Aucune » envoie `"none"`.

## Détails techniques

### `src/components/project/SessionCard.tsx`

- Supprimer la fonction interne `decisionBtn` et le bloc `<div className="mt-auto flex flex-wrap gap-1.5 pt-1">…</div>` (lignes ~409-416).
- Déplacer la décision **dans** le bloc `{clips.length > 0 && (...)}`, **juste après** la `div` « Précédent / vitesse / Suivant », à l'intérieur du même fragment. Si `clips.length === 0`, afficher quand même le sélecteur (la décision doit rester accessible) — l'envelopper dans un conteneur `mt-auto` pour qu'il reste collé en bas dans les deux cas.
- Construire un objet `decisionConfig` :
  ```ts
  const decisionConfig: Record<string, { label: string; className: string }> = {
    none: { label: "Aucune décision", className: "" },
    rejected: { label: "Non", className: "bg-destructive text-destructive-foreground border-destructive" },
    second_opinion: { label: "À discuter", className: "bg-warning text-warning-foreground border-warning" },
    shortlisted: { label: "Retenu", className: "bg-success text-success-foreground border-success" },
    in_progress: { label: "En cours", className: "bg-info text-info-foreground border-info" },
    accepted: { label: "Oui", className: "bg-success-strong text-success-strong-foreground border-success-strong" },
  };
  ```
- Rendu :
  ```tsx
  <div className="mt-auto flex justify-center pt-2">
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Select value={decision} onValueChange={(v) => onDecisionChange(session.id, v)}>
            <SelectTrigger className={cn("h-9 min-w-[12rem] justify-center gap-2", decisionConfig[decision]?.className)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucune décision</SelectItem>
              <SelectItem value="rejected">Non</SelectItem>
              <SelectItem value="second_opinion">À discuter</SelectItem>
              <SelectItem value="shortlisted">Retenu</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="accepted">Oui</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TooltipTrigger>
      {decision !== "none" && authorTooltip && <TooltipContent>{authorTooltip}</TooltipContent>}
    </Tooltip>
  </div>
  ```
- Nettoyer les imports devenus inutiles : `Check, HelpCircle, X, ThumbsUp, Clock` de `lucide-react` (garder `ChevronLeft`, `ChevronRight`, `RotateCcw`, `RotateCw`).
- Aucune modification des props ni du contrat avec `ProjectDetail.tsx` : `onDecisionChange` reçoit déjà une string.

### Hors scope
- La vue Tableau (rangs) garde son `Select` actuel — aucune modification.
- Aucune modification backend, ni de type, ni du store.

## Vérification
- Vue Cartes : le sélecteur apparaît centré sous « Précédent / Suivant ».
- Choisir « Retenu » → trigger devient vert, la valeur persiste après rechargement, l'auteur s'affiche en tooltip.
- Choisir « Aucune décision » → trigger redevient neutre.
- Si la session n'a aucune vidéo (`clips.length === 0`), le sélecteur reste affiché en bas de la carte.
