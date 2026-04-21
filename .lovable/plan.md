

## Plan — Vraies relances IA pendant l'entretien

### Constat (audit du code actuel)

- `handleSendResponse` (l. 920) avance l'UI **avant** la réponse IA → la "relance" générée par `ai-conversation-turn` n'est jamais jouée au candidat, elle sert seulement au rapport.
- `SILENCE_TIMEOUT_MS = 45s` (l. 128) **termine l'entretien** au lieu de relancer le candidat.
- `auto_skip_silence` (l. 1175) coupe la parole après 3s + 3s → trop agressif et non configurable par question.
- `relance_level` (light/medium/deep) est envoyé à l'IA mais sans effet visible côté candidat.
- Aucune relance déclenchée pendant un silence : seul le bouton « Ma réponse est finie » déclenche un tour IA.

### Objectif

La recruteuse IA doit pouvoir intervenir **avant** de passer à la question suivante :
1. Si la réponse est trop courte/floue → poser une relance (selon `relance_level`).
2. Si le candidat reste silencieux trop longtemps → relancer doucement, pas terminer.
3. Le candidat **entend** la relance, y répond, puis (selon le niveau) une 2ᵉ relance peut suivre, ou on passe à la suite.

### 1. Nouveau cycle de réponse (cœur du changement)

Refonte de `handleSendResponse` dans `src/pages/InterviewStart.tsx` :

```text
Candidat clique "Ma réponse est finie"
        │
        ▼
Persist réponse + appel IA (cette fois EN ATTENTE)
        │
        ▼
IA renvoie { action, message }
   ├─ action = "follow_up" → on JOUE message au candidat (TTS), on relance l'écoute
   │                          Compteur followUpsAsked[questionIdx]++ (cap = max_follow_ups)
   ├─ action = "next"      → transition + question suivante (comportement actuel)
   └─ action = "end"       → fin d'entretien (dernière question OK)
```

Côté UI pendant le tour IA : badge discret « L'IA réfléchit… » (≤ 2 s en moyenne) au lieu de montrer un faux silence.

### 2. Mise à jour de `ai-conversation-turn`

Fichier : `supabase/functions/ai-conversation-turn/index.ts`

- Forcer une **réponse JSON structurée** :
  ```json
  { "action": "follow_up" | "next" | "end", "message": "texte court à dire au candidat" }
  ```
- Ajouter au prompt :
  - Compteur de relances déjà posées sur cette question + plafond (`max_follow_ups`).
  - Règle : si `relance_level = light` OU `follow_ups_asked >= max_follow_ups` → forcer `action = "next"`.
  - Si réponse < 15 mots OU vague (« je sais pas trop », « euh ») → privilégier `follow_up`.
  - Une seule question à la fois, max 2 phrases.
- Conserver les niveaux light/medium/deep existants pour piloter l'agressivité.

### 3. Relance sur silence (remplace l'auto-skip et le 45s killer)

- `SILENCE_TIMEOUT_MS` passe à **90 s** et **termine** seulement si plus aucune activité depuis le **début** du silence (dernier mot reconnu).
- Nouveau palier intermédiaire **silence prolongé** :
  - À **8 s** sans parole → bandeau visuel discret « Prenez votre temps… »
  - À **15 s** sans parole → l'IA dit une **relance d'encouragement** (sélectionnée parmi 3 phrases courtes localement, **sans appel réseau** pour rester instantané) :
    - « Prenez votre temps, je vous écoute. »
    - « Voulez-vous que je reformule la question ? »
    - « Un exemple concret peut aider, n'hésitez pas. »
  - À **30 s** supplémentaires sans parole → propose le bouton **« Passer cette question »** (déjà existant, simplement mis en avant).
- L'auto-skip 3s + 3s actuel devient désactivé par défaut (option `auto_skip_silence` du projet conservée mais OFF).

### 4. Nouveau réglage par question : `max_follow_ups`

- La colonne `max_follow_ups` existe déjà sur `questions`, `question_templates`, `interview_template_questions` (utilisée nulle part côté candidat aujourd'hui).
- Dans `QuestionFormDialog.tsx`, ajouter dans la section déjà existante « Aide candidat » un sélecteur **« Relances IA max »** : `0 / 1 / 2` (défaut = 1 si `relance_level ≠ light`, sinon 0).
- Affichage RH dans `StepQuestions.tsx` : pastille « ↻ 2 » quand `max_follow_ups > 0`.

### 5. Détails UX côté candidat

- Quand l'IA pose une relance : la zone reste sur la **même question** (pas de saut de numéro), un petit chevron apparaît : `Question 3/10 · Relance 1`.
- Le timer max de réponse (`max_response_seconds`) est **réinitialisé** à chaque relance.
- Le bouton « Ma réponse est finie » reste toujours actif pour passer à la suite immédiatement si le candidat le souhaite.
- L'historique chat affiche les relances en italique pour les distinguer des questions principales.

### 6. Détails techniques

| Fichier | Changement |
|---|---|
| `supabase/functions/ai-conversation-turn/index.ts` | Output JSON `{action, message}` + prompt enrichi avec compteur de relances |
| `src/pages/InterviewStart.tsx` | `handleSendResponse` attend l'IA avant d'avancer ; nouvel état `followUpsByQuestion`; refonte `resetSilenceTimer` en 3 paliers ; affichage « Relance N » |
| `src/components/QuestionFormDialog.tsx` | Champ « Relances IA max » (0/1/2) |
| `src/components/project/StepQuestions.tsx` | Pastille ↻ N |

### Hors scope

- Pas d'ajout de nouvelle colonne DB (toutes existent déjà).
- Pas de streaming de la réponse IA (latence ~1-2 s acceptable, badge « réfléchit »).
- Pas de modification du rapport ni du scoring.
- Pas de relance sur les questions audio/vidéo non encore lues (uniquement après une vraie réponse candidat ou un silence prolongé).

