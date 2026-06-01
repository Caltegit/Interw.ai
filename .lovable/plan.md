## Objectif

La page « rapport partagé » (`/r/:token` → `SharedReport.tsx`) doit afficher **exactement la même mise en page** que la page « rapport connecté » (`/sessions/:id` → `SessionDetail.tsx`), à deux exceptions près :

1. **Aucune action** : pas de bouton Partager / Copier / Télécharger les vidéos / Régénérer / Email / Supprimer / Modifier liens / Décision recruteur / Relancer analyse vocale / Relancer analyse non-verbale / Notes recruteur.
2. **Pas de téléchargement MP4 depuis le lecteur vidéo** (le bouton « MP4 » en haut à droite du `SessionVideoNavigator` doit disparaître).

Le reste — sticky bar, onglets, contenu, transcription, structure 2 colonnes — doit être identique.

## Approche

Plutôt que de dupliquer 800 lignes, on **extrait le rendu commun** dans un composant partagé, puis les deux pages l'utilisent avec des props différentes.

### 1. Nouveau composant `src/components/session/SessionReportView.tsx`

Reçoit en props toutes les données et les callbacks utiles :

```ts
interface SessionReportViewProps {
  session: any;
  report: any;
  messages: any[];
  projectAverages: ProjectAverages | null;
  // mode lecture seule = aucune action, aucun textarea
  readOnly: boolean;
  // Actions recruteur (optionnelles, ignorées si readOnly)
  decision?: RecruiterDecision;
  onDecisionChange?: (d: RecruiterDecision) => void;
  isDecisionPending?: boolean;
  shareUrl?: string | null;
  onShare?: () => void;
  onCopyShare?: () => void;
  copied?: boolean;
  isShareLoading?: boolean;
  onDownloadVideos?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onEmail?: () => void;
  onEditLinks?: () => void;
  onDelete?: () => void;
  // Notes
  recruiterNotes?: string;
  onRecruiterNotesChange?: (v: string) => void;
  // Vidéo
  sessionId?: string;        // pour ouvrir l'onglet d'export (uniquement non-readOnly)
  hideVideoDownload?: boolean; // cache le bouton MP4 du player
  // Onglet Voice — relance analyse (uniquement non-readOnly)
  onAnalyzeVoice?: () => void;
  analyzingVoice?: boolean;
  // Onglet Attitude — composant complet ou version read-only
}
```

Le composant contient :
- Tout le bloc layout depuis `flex flex-col gap-4` jusqu'à la fin (sticky bar, `Tabs`, `DecisionBanner`, vidéo via portail, onglets Reco IA / Big Five / Orale / Attitude / Transcription).
- En `readOnly` : passe `readOnly` à `DecisionBanner` (qui cache déjà les boutons), n'affiche pas `notesSlot`, n'affiche pas le bouton « Lancer l'analyse vocale », et utilise un rendu non-verbal sans bouton « Relancer ».
- Le portail/sticky reste actif dans les deux modes (mêmes proportions).

### 2. `SharedReport.tsx` — simplifié

- Garde l'appel `consume-report-share` + récupération `report/session/messages`.
- Calcule `projectAverages` via le hook existant.
- Rend `<SessionReportView readOnly hideVideoDownload ... />`.
- Conserve le bandeau « Rapport partagé via un lien sécurisé · Généré par Interw.ai » en pied.

### 3. `SessionDetail.tsx` — simplifié

- Garde toute la logique d'état (mutations, sticky, copilot, suppression, dialogues).
- Garde les 3 dialogues (`BulkEmailDialog`, `CandidateLinksDialog`, `ShareReportDialog`, `AlertDialog` suppression) côté page.
- Délègue le rendu central à `<SessionReportView ... />` en passant toutes les actions.
- Note : la barre de copilot et son layout `gap` restent autour du composant.

### 4. `SessionVideoNavigator` — prop `hideDownload`

Ajouter `hideDownload?: boolean`. Quand `true`, le bouton « MP4 » (`<div className="pointer-events-none absolute top-2 right-2">`) n'est pas rendu.

### 5. Onglet « Attitude » en read-only

`NonverbalTabContent` requiert un `sessionId` pour relancer l'analyse. Deux options :
- (a) Ajouter une prop `readOnly` qui cache le bouton « Relancer l'analyse ».
- (b) En mode read-only, faire rendre directement `<NonverbalProfileCard>` (comme aujourd'hui dans `SharedReport`) sans passer par `NonverbalTabContent`.

→ Option (a) plus simple, garantit même rendu pour les cas « analyse failed » / « pas encore lancée ». À implémenter dans `NonverbalTabContent`.

## Fichiers touchés

- **Créé** : `src/components/session/SessionReportView.tsx` (~500 lignes, extrait de SessionDetail)
- **Modifié** : `src/pages/SharedReport.tsx` (drastiquement raccourci)
- **Modifié** : `src/pages/SessionDetail.tsx` (rendu central remplacé par `SessionReportView`)
- **Modifié** : `src/components/session/SessionVideoNavigator.tsx` (prop `hideDownload`)
- **Modifié** : `src/components/session/NonverbalTabContent.tsx` (prop `readOnly`)

## Non-objectifs

- Pas de changement de comportement côté SessionDetail (ni régression).
- Pas de changement DB / edge function.
- Pas de modification du design system.
