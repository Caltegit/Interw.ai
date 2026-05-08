## Plan : ré-afficher les entretiens terminés (correction « en cours de traitement »)

### Problème constaté

Sur `src/pages/ProjectDetail.tsx`, la liste des sessions n'affiche que les sessions « prêtes ». La règle actuelle (`isReady`, ligne 444-447) considère qu'une session est prête uniquement si **toutes** ses conditions sont remplies :

1. `status === 'completed'`
2. un rapport existe dans `reports`
3. **aucun `session_message` candidat n'a `transcription_status ≠ 'done'`**

La 3ᵉ condition est le bug : sur les 115 sessions complétées avec rapport, **77 sont masquées** parce qu'elles contiennent encore des messages avec un statut de transcription `pending`, `raw`, `failed` ou `processing` (ancien historique, transcription non rejouée, etc.). Pourtant ces sessions ont déjà un rapport généré → elles sont bel et bien traitées.

### Correction

Dans `src/pages/ProjectDetail.tsx` :

1. **Simplifier `isReady`** : une session est prête dès que `status === 'completed'` ET qu'un rapport existe (`reportsBySession[s.id]`). On retire la vérification basée sur `transcription_status`.

2. **Recalculer `processingCount`** : compter les sessions `status === 'completed'` **sans rapport** (au lieu de « avec messages non transcrits »). Le bandeau « X entretien(s) en cours de traitement » ne s'affiche donc plus que pour les sessions qui attendent vraiment leur rapport IA.

3. **Nettoyage** : supprimer l'état `transcriptionPendingBySession` et la requête associée sur `session_messages` (lignes 178-202) puisqu'ils ne servaient qu'à cet usage. Cela allège aussi le chargement de la page.

### Hors scope

- Pas de migration DB.
- Pas de changement du flux de transcription côté entretien.
- Pas de modification de `SessionStatusBadge`.
- Pas de touche aux autres écrans (Dashboard, SessionDetail).
