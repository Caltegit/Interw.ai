## Objectif

Rendre les **deux players identiques** (vue tableau projet + vue rapport) avec :
- Gros bouton **Play** central au repos
- Bouton **téléchargement MP4**
- Boutons ±10s et sélecteur de vitesse 1× / 1.5× / 2×
- Overlay **titre de question** centré en bas, fond transparent, sur une ligne, tronqué à 30 caractères, visible quand le curseur n'est PAS sur le player et masqué au survol

Seule la **taille** diffère (chaque hôte garde son `aspect-video` à la largeur de sa carte).

## Approche : composant partagé

Création de `src/components/session/SessionClipPlayer.tsx` qui encapsule tout le rendu du player + ses overlays. Le composant existant `SessionVideoNavigator` est déjà ce player avec sa logique de navigation, portail et récupération MP4 — on en extrait la **partie purement visuelle** (boîte `aspect-video`, `<video>`, overlays ±10s / vitesse / Play central / Download / nouveau titre overlay) dans `SessionClipPlayer`.

- `SessionVideoNavigator` continue à gérer : liste de clips, navigation Préc/Suiv, sélecteur de question, portail mini-player, transcripts, recovery → il consomme `SessionClipPlayer` en interne.
- `SessionCard` (vue tableau) remplace son bloc `<video>` actuel par `<SessionClipPlayer />` et profite ainsi automatiquement du gros Play, du Download MP4 et de l'overlay titre.

## Détail des changements

### 1. `SessionClipPlayer.tsx` (nouveau)

Props :
```ts
{
  url: string;                  // clip courant
  questionTitle?: string | null;
  sessionId?: string;           // pour useMp4Download (lien export dédié si fourni)
  onEnded?: () => void;
  autoPlay?: boolean;
}
```

Comportement et UI repris à l'identique de `SessionVideoNavigator` (lignes ~511-720) :
- conteneur `relative overflow-hidden rounded-lg bg-black aspect-video`
- `<video>` plein avec gestion `playsInline`, `preload`, `onLoadedMetadata` (gestion durée `Infinity` via reseek), `onEnded`
- Overlay haut : pilules ±10s centrées en haut + colonne vitesse 1×/1.5×/2× en haut-gauche
- Overlay centre : gros bouton Play (visible quand `paused`), masqué en lecture
- Overlay bas-droit : bouton Download MP4 (état Idle/Loading + progress, hook `useMp4Download`)
- **Nouveau** overlay bas : bandeau `absolute inset-x-0 bottom-0` avec dégradé `from-black/60 to-transparent`, texte centré blanc `text-xs font-medium truncate`. Affiché par défaut, `opacity-0` au `group-hover` (transition 200ms). Le conteneur racine reçoit la classe `group`.
- Troncature côté composant : `title.length > 30 ? title.slice(0,30).trimEnd() + '…' : title`. Si pas de titre, pas de bandeau.

### 2. `SessionVideoNavigator.tsx`

- Ajouter `questionTitle?: string | null` à `SessionVideoClip`.
- Remplacer le bloc visuel actuel par `<SessionClipPlayer url={…} questionTitle={current.questionTitle} sessionId={sessionId} onEnded={…} />`.
- Garde toute sa logique externe : liste clips, navigation, portail, sélecteur, recovery (`recover-session-video`), `hideDownload` est désormais géré en NE passant simplement pas `sessionId`/en masquant via prop `hideDownload` propagée.

### 3. `SessionReportView.tsx`

- Ligne ~171, ajouter `questionTitle: projectQ?.title ?? null` dans la construction de `sessionClips`.

### 4. `SessionCard.tsx` (vue tableau projet)

- Étendre l'interface `Question` locale avec `title: string`.
- S'assurer que `ProjectDetail` sélectionne `title` quand il charge les questions (vérifier le `.select(...)` ; si manquant, l'ajouter).
- Construire des objets clip enrichis avec `questionTitle` (lookup via `questionByid`).
- Remplacer tout le bloc `<video> + overlays ±10s + vitesse` (lignes 268-346) par `<SessionClipPlayer url={current.url} questionTitle={…} sessionId={session.id} onEnded={() => goTo(index+1, true)} />`.
- Supprimer les états locaux devenus inutiles (`rate`, `durationSec`, `videoRef` interne au rendu, `safePlay/stopCurrent`) — ils vivent maintenant dans `SessionClipPlayer`. Conserver la navigation Préc/Suiv et le sélecteur de question existants sous le player.

### 5. Hook MP4

Aucun changement à `useMp4Download`. Quand `sessionId` est fourni, le hook ouvre la page d'export dédiée (comportement existant côté Navigator) ; même comportement appliqué côté SessionCard.

## Hors scope

- Aucun changement SQL.
- Pas de modification des players intro/library/MediaRecorder/HighlightReel/QuestionAnswerRow.
- Pas d'unification du sélecteur de question / boutons Préc-Suiv (ils sont spécifiques au contexte).

## Vérification

1. Vue tableau d'un projet :
   - Le player affiche le gros bouton Play au repos.
   - Le titre de question apparaît centré en bas, disparaît au survol, réapparaît au mouseleave, tronqué à 30 caractères.
   - Boutons ±10s, vitesse, et **Download MP4** présents et fonctionnels.
   - Préc/Suiv et sélecteur Question N fonctionnent comme avant.
2. Vue rapport (`/sessions/:id`) :
   - Mêmes commandes, même rendu, plus l'overlay titre.
   - Portail mini-player et recovery toujours fonctionnels.
3. Cas sans titre (anciennes questions) : pas de bandeau, le reste fonctionne.