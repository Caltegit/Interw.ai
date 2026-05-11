## Objectif

L'onglet Transcription fait doublon avec les transcriptions déjà visibles au niveau de chaque question. On le remplace par un nouvel onglet « Communication orale » qui met en avant les 6 jauges paraverbales (0 à 10) déjà calculées par l'analyse vocale.

## Changements

### 1. `src/pages/SessionDetail.tsx`
- Remplacer l'onglet `transcript` par un onglet `voice` :
  - Trigger : icône `Mic`, libellé « Communication orale »
  - Contenu : la `ParaverbalProfileCard` (6 jauges + résumé + extraits)
  - État vide : message « Analyse vocale non disponible pour cette session » si `report.paraverbal_analysis?.profile` est absent
- Retirer la `ParaverbalProfileCard` de l'onglet « Reco IA » pour éviter le doublon
- Supprimer le code devenu inutile lié à l'ancien onglet : `pendingTranscriptionCount`, `handleRetranscribe`, `retranscribing`, `VirtualizedMessageList`, le bandeau « Nettoyer la transcription »
- Nettoyer les imports devenus inutilisés (`MessageSquare`, `Sparkles`, `VirtualizedMessageList`, etc.)

### 2. `src/pages/SharedReport.tsx`
- Mêmes changements côté rapport public partagé : remplacer l'onglet `transcript` par `voice` avec la `ParaverbalProfileCard`, retirer la carte du bloc « Reco IA », nettoyer les imports.

### 3. Hors périmètre
- `ParaverbalProfileCard.tsx` : aucun changement (la carte reste identique avec ses 6 jauges).
- Pipeline de transcription / nettoyage IA : conservé (toujours utilisé par les questions).