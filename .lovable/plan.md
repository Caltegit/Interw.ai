

## Diagnostic — entretiens longs (10–30 min)

J'ai relu le moteur d'entretien. La base est saine, mais plusieurs points vont coincer dès qu'on dépasse 10 minutes. Voici le constat puis un plan d'amélioration priorisé.

### Ce qui tient la route

- **Vidéo segmentée par question** : chaque réponse est uploadée en `.webm` séparément (`q0.webm`, `q1.webm`…). Pas de gros fichier final, pas de risque de perdre 30 min d'enregistrement si la fin échoue. Très bien.
- **Persistance message par message** dans `session_messages` au fil de l'eau. Si le candidat ferme l'onglet, l'historique est préservé.
- **Pause / reprise** déjà gérée avec replay de la question.

### Risques identifiés sur des entretiens longs

| # | Problème | Gravité | Détail |
|---|---------|---------|--------|
| 1 | **Limite dure de 10 min** (`MAX_DURATION_MS = 10 * 60 * 1000`) qui coupe l'entretien | Bloquant | Toi-même tu parles de 10–30 min, le code coupe à 10 min pile. |
| 2 | **STT navigateur (`webkitSpeechRecognition`)** | Élevé | Au-delà de 5–10 min, Chrome coupe régulièrement la session (perte de mots, redémarrages). Sur Safari iOS, c'est pire. Pas de fallback serveur. |
| 3 | **Historique IA non plafonné** envoyé à chaque tour | Moyen | `aiMessages` grossit indéfiniment → coût et latence du LLM montent à chaque question. À 20 questions × relances, le prompt devient lourd. |
| 4 | **Tous les messages restent en mémoire React** + auto-scroll | Faible-moyen | 100+ bulles + transcript live re-rendent à chaque keystroke vocal. Sur mobile, ça lague. |
| 5 | **Stream vidéo + MediaRecorder en continu 30 min** | Moyen | Risque d'OOM sur mobile bas de gamme, surchauffe, batterie. Pas de reprise si le MediaRecorder plante. |
| 6 | **Réseau instable non géré** | Élevé | Si l'upload d'un segment vidéo échoue (`return null`), on continue sans retry. Sur 30 min en wifi capricieux, garanti d'en perdre. |
| 7 | **Pas de heartbeat / reprise de session** | Moyen | Si l'onglet est rechargé à la 20ᵉ minute, l'entretien est perdu (pas de mécanisme de reprise depuis `session_messages`). |
| 8 | **Génération de rapport** : `generate-report` reçoit toute la transcription d'un coup | À vérifier | Sur 30 min × relances, la transcription peut dépasser le contexte du modèle ou rallonger fortement le temps de génération. |

### Plan d'amélioration proposé (par priorité)

**P0 — Indispensables avant de tester du long**

1. **Durée max paramétrable par projet** : champ `projects.max_duration_minutes` (défaut 15, plage 5–45). Remplacer la constante en dur. Affiché dans le formulaire de création de projet, à côté de la limite de réponse par question.
2. **Retry + file d'attente sur upload vidéo** : 3 tentatives avec backoff (1s, 3s, 8s). Si toujours en échec, on garde le blob en IndexedDB et on retente en arrière-plan. Le message texte est persisté quoi qu'il arrive.
3. **Plafond d'historique IA** : ne garder que les N derniers échanges (genre 6 derniers tours) + un résumé court des questions précédentes injecté dans le system prompt. Réduit coût, latence, et risque de dépasser le contexte.

**P1 — Robustesse**

4. **Reprise de session** : si le candidat recharge la page avec le même token et que `session.status = in_progress`, proposer « Reprendre l'entretien ? ». On reconstruit l'état depuis `session_messages` et on repart à la question suivante non répondue.
5. **Heartbeat de session** : ping `sessions.last_activity_at` toutes les 30 s. Permet de détecter les abandons et d'éviter qu'une session « zombie » bloque le candidat.
6. **STT plus robuste** : 
   - Restart automatique du `SpeechRecognition` toutes les 50 s même sans erreur (Chrome a une limite molle vers 60 s).
   - Fallback : si on détecte 3 `onerror` de suite, on bascule sur un mode « enregistrer puis transcrire » avec une edge function (Whisper / Lovable AI) sur le segment audio de la question.

**P2 — Performance UI**

7. **Virtualisation de la liste de messages** au-delà de 30 bulles (ou simplement `overflow + scroll vers le bas` sans tout remonter dans le DOM). Désactiver l'auto-scroll smooth après 50 messages.
8. **Limite de `liveTranscript`** affiché : tronquer à 500 caractères (on garde le full en ref pour l'envoi).

**P3 — Rapport long**

9. **Rapport en deux passes** quand l'entretien dépasse 15 min : 
   - Pass 1 : résumé par question (parallèle, court)
   - Pass 2 : synthèse globale + scoring à partir des résumés
   - Évite les timeouts de l'edge function et améliore la qualité.

### Ce que je propose comme prochaine étape

Plutôt que tout faire d'un coup, attaquer **P0 uniquement** d'abord (1, 2, 3) — c'est ce qui débloque réellement le test des entretiens longs. P1 et P2 viennent après ton premier vrai test, en fonction de ce que tu constates.

Tu veux que je parte sur P0 ?

