## Diagnostic

La session `8b0fa984-…` a 9 vidéos assemblées (`q0.webm` à `q8.webm`). Toutes pèsent entre 19 et 115 Mo… **sauf `q0.webm` qui ne fait que 579 Ko**, alors que ses 80+ chunks bruts (`q0/chunk-00000.webm` … `chunk-00080+`) totalisent ~9 Mo dans le storage.

Conséquence : le lecteur charge `q0.webm` mais ne reçoit qu'un fragment de début (les ~5 premiers chunks). Le fichier est donc tronqué/corrompu — d'où la vidéo « coincée, impossible à lire ».

Les autres vidéos (q1…q8) sont OK côté storage. Le bug visuel concerne **uniquement Q0**.

### Pourquoi c'est arrivé

`finalize-abandoned-session` saute la ré-assemblée si `qN.webm` existe déjà dans le dossier. Ici Q0 a été partiellement uploadée en direct par le navigateur, puis les chunks suivants ont continué d'arriver alors que le `MediaRecorder.stop()` final n'a pas pu pousser le blob complet. Le finaliseur a vu le `q0.webm` (partiel) et n'a rien refait.

## Plan de récupération (1 action)

Reconstruire `q0.webm` à partir des chunks réels, sans toucher au reste.

### Étapes

1. **Supprimer** l'objet storage `interviews/8b0fa984-…/q0.webm` (le partiel).
2. **Appeler `finalize-abandoned-session`** avec `session_id = 8b0fa984-0b2e-4c30-91bd-25928f9c25ba`.
   - Le code existant relistera les chunks `q0/chunk-*.webm` triés, streamera l'assemblage et écrira un nouveau `q0.webm` propre (~9 Mo).
   - Les Q1…Q8 sont déjà présents → la fonction passera sans rien refaire dessus.
3. **Re-transcription Q0** (optionnel) : la transcription actuelle de Q0 a été faite sur le fichier tronqué. Une fois Q0 reconstruite, relancer `transcribe-session` pour la seule réponse Q0 si tu veux un transcript correct (sinon laisser tel quel, le rapport n'a pas vocation à être régénéré ici).
4. **Vérifier** dans Domaine Chapelle → session Iris/Maxime → onglet Vidéo que Q0 se lit jusqu'au bout.

### Détails techniques

- Action sur `storage.objects` via migration SQL (DELETE) puis appel de l'edge function existante. Pas de nouveau code.
- Aucun changement de schéma, aucun fichier source modifié.
- Pas de risque sur les autres sessions : opération scopée à un seul `session_id`.

### Hors périmètre

- Le **fix de fond** (timer `max_response_seconds` non respecté sur Q4/Q7, `duration_seconds` sous-estimée, `q0.webm` partiel non détecté par le finaliseur) reste à traiter dans un second temps — comme convenu, on parle du fix après.
