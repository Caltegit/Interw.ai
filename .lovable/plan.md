

## Topo — Ce qui reste à faire

### Lot 2 — Refacto `InterviewStart.tsx` (2092 lignes) — RISQUÉ

Découper le fichier le plus critique en hooks spécialisés. À ne lancer **qu'après** avoir étoffé la suite E2E.

**Pré-requis : 5 nouveaux tests Playwright**
- Pause / reprise pendant l'enregistrement
- Échec STT (Web Speech indisponible)
- Échec upload segment (storage down)
- Sortie plein écran pendant l'entretien
- Réponse vide / silence prolongé

**Extractions, dans cet ordre (un hook = un commit testable)**
1. `useExamRoomLock` — plein écran, focus onglet, anti-triche
2. `useInterviewTimer` — chrono global et par question
3. `useSpeechRecognition` — Web Speech API (start, stop, onresult, onerror)
4. `useMediaRecorder` — caméra + micro + segments
5. `useInterviewSession` — orchestration IA, persistance, navigation entre questions

Cible : `InterviewStart.tsx` < 400 lignes, uniquement de l'assemblage.

### Lot 3.2 — Virtualisation des messages

Brancher `@tanstack/react-virtual` sur les listes longues :
- Historique des messages dans `InterviewStart` (peut dépasser 100 items)
- Liste des messages dans `SessionDetail`

Gain : scroll fluide même sur entretiens d'1h+.

### Lot 3.4 — Composant `<ProjectForm />` partagé

Fusionner la logique dupliquée entre `ProjectNew.tsx` et `ProjectEdit.tsx` dans un seul composant. Pré-requis : tests E2E sur création + édition (création existe déjà, édition à ajouter).

### Ordre recommandé

1. **Lot 3.2** d'abord — petit, isolé, gain visible immédiat.
2. **Lot 3.4** ensuite — refacto modérée avec un test E2E à ajouter.
3. **Lot 2** en dernier — gros chantier, à faire posément avec les 5 tests en filet.

Dis-moi par lequel on commence.

