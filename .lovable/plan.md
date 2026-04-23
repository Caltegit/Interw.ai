

## Recalibrer les silences candidat

### Constat

Le mécanisme existe déjà dans `InterviewStart.tsx` : 3 relances vocales → mise en pause automatique → avertissement → arrêt forcé. Mais les seuils actuels sont serrés (8 s / 13 s / 18 s / pause à 25 s / arrêt 65 s) et les 3 relances disent des choses différentes. La demande : unifier le message des relances et étendre la pause à **2 minutes** avant l'arrêt.

### Nouveaux seuils

| Étape | Délai depuis dernière activité | Action |
|---|---|---|
| Indice visuel discret | 8 s | « Prenez votre temps… » sous le micro |
| 1ʳᵉ relance vocale | 12 s | IA dit : « Prenez votre temps, je vous écoute. » |
| 2ᵉ relance vocale | 22 s | IA dit : « Prenez votre temps, je vous écoute. » |
| 3ᵉ relance vocale | 32 s | IA dit : « Prenez votre temps, je vous écoute. » |
| **Pause forcée** | 42 s | IA dit : « Je mets l'entretien en pause, reprenez quand vous voulez. » + bouton Reprendre mis en avant |
| Avertissement vocal | pause + **1 min 50 s** | IA dit : « Il semblerait que vous ne soyez plus là. Je vais arrêter cette session dans quelques secondes. » |
| Compte à rebours visible | 10 s | Affichage du décompte à l'écran |
| **Arrêt forcé** | pause + **2 min** | Session terminée → page `InterviewComplete` |

Le compteur de 2 min court depuis l'instant de mise en pause forcée. Si le candidat appuie sur Reprendre avant la fin, tout est annulé et le cycle silence repart à zéro.

### Changements concrets

Dans `src/pages/InterviewStart.tsx` uniquement :

1. **Constantes silence** (autour de la ligne 156-164) :
   - `SILENCE_HINT_MS = 8 * 1000`
   - `SILENCE_NUDGE_1_MS = 12 * 1000`
   - `SILENCE_NUDGE_2_MS = 22 * 1000`
   - `SILENCE_NUDGE_3_MS = 32 * 1000`
   - `SILENCE_AUTOPAUSE_MS = 42 * 1000`
   - `SILENCE_END_WARNING_MS = SILENCE_AUTOPAUSE_MS + 110 * 1000` (1 min 50 s après la pause)
   - `SILENCE_TIMEOUT_MS = SILENCE_AUTOPAUSE_MS + 120 * 1000` (2 min pile après la pause)
   - `END_COUNTDOWN_SECONDS = 10` (inchangé)

2. **Texte des 3 relances** (lignes 235-246) : les 3 disent désormais la même phrase « Prenez votre temps, je vous écoute. » conformément à la demande.

3. **Texte de la mise en pause forcée** (ligne 254) : précisé en « J'ai mis l'entretien en pause. Cliquez sur Reprendre quand vous êtes prêt. »

4. **Toast de pause auto** (ligne 250-253) : titre « Entretien mis en pause » + description « Reprenez dans les 2 minutes pour continuer. »

5. **Toast d'arrêt forcé** (ligne 301-304) : description « Aucune reprise après 2 minutes de pause. »

Aucune autre logique à toucher : `pauseInterviewRef` et `armEndWarningRef` existent déjà, le compte à rebours est déjà branché, et `resetSilenceTimer` (appelée à toute activité de parole/clic) annule bien le cycle.

### Hors champ

- Pas de changement de l'UI du bandeau de pause (déjà en place avec bouton Reprendre).
- Pas de changement côté serveur ni base de données.
- Pas de notification email au recruteur sur abandon (à voir dans une autre passe si besoin).

