## Approche unique : timestamp proportionnel

Remplacer toute la logique de résolution des `start_seconds` dans `generate-report` par une seule méthode : **position du premier mot de la citation dans la transcription du message, ramenée à la durée du clip**.

```
positionMot   = index du 1er mot de la citation dans content normalisé
totalMots     = nombre de mots de content normalisé
dureeMessage  = max(transcript_segments[].end) si dispo, sinon totalMots / 2.5
start_seconds = (positionMot / totalMots) × dureeMessage
```

On supprime :
- la recherche par segment unique,
- la recherche par fenêtre glissante de 3 segments,
- le repli sur l'estimation IA (`fallback`).

L'estimation IA n'est plus utilisée : seul le calcul proportionnel est conservé. Si la citation n'est pas trouvable dans le texte (mots manquants), on retourne `null` (le lecteur joue alors depuis le début du clip).

## Modification

Dans `supabase/functions/generate-report/index.ts`, remplacer `resolveStart` par une nouvelle implémentation :

1. Pré-calcul par message :
   - `wordsByMessage`  = liste des mots normalisés de `content`.
   - `durationByMessage` = `max(seg.end)` si segments présents, sinon `words.length / 2.5`.
2. `resolveStart(messageId, quote)` :
   - Normalise la citation, prend ses 3 premiers mots.
   - Cherche cette séquence dans `wordsByMessage[messageId]` ; si introuvable, essaie 2 mots, puis 1 mot.
   - Retourne `(index / words.length) * duration` arrondi à 0,1 s, ou `null` si rien.
3. Mise à jour de `fixEntry` et de tous les appels existants : la signature passe à `(messageId, quote)` (plus de `fallback`). Aucun autre site d'appel ne change.

Toutes les sections (decision_drivers, signals, fit_breakdown, communication_profile, soft_skills, red_flags, personality_profile, paraverbal_analysis) bénéficient automatiquement.

## Effets de bord

- Aucun changement de schéma.
- Aucun changement frontend.
- Les anciens rapports gardent leurs valeurs ; régénérer le rapport de Marine Dupré pour appliquer la nouvelle logique.

## Vérification

1. Régénérer le rapport de DUPRÉ Marine.
2. Cliquer chaque « Voir le moment » du panneau Personnalité — la vidéo doit démarrer à un instant cohérent (au début / milieu / fin selon où la citation apparaît dans la réponse).
3. Vérifier qu'aucun rapport ne plante (citation introuvable → `null` → lecture depuis 0 acceptée par le lecteur).
