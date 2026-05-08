## Plan : améliorer la section « Voix du recruteur »

Refonte de la carte actuellement intitulée « Genre de la voix » dans `src/components/project/ProjectForm.tsx` (lignes ~476-519) pour la rendre plus claire, plus visuelle et plus engageante.

### Changements UI

1. **Titre de la carte** : « Voix du recruteur » (au lieu de « Genre de la voix »), avec une courte description :
   « Choisissez la voix qui sera utilisée pendant l'entretien. »

2. **Sélecteur Femme / Homme repensé** : remplacer le `RadioGroup` simple par deux cartes cliquables côte à côte (toujours basées sur `RadioGroup` pour l'accessibilité), avec :
   - une icône (`User` / `UserRound` de lucide-react)
   - le libellé « Femme » / « Homme »
   - un état sélectionné avec bordure et fond `primary/10`
   - un bouton « Écouter » (icône `Volume2`) sur chaque carte pour pré-écouter la voix par défaut du genre via le cache TTS existant (`ttsCache`)

3. **Voix actuellement sélectionnée** : afficher sous les cartes une ligne discrète
   « Voix sélectionnée : [Nom de la voix] » avec un petit bouton « Écouter » à côté pour entendre la voix exacte choisie (utile quand l'utilisateur a personnalisé via « Modifier la voix » ou cloné).

4. **Actions secondaires** : conserver « Modifier la voix » et « Cloner ma voix » mais les transformer en boutons `variant="outline" size="sm"` avec icônes (`Settings2`, `Mic`) pour plus de visibilité, alignés à droite.

### Détails techniques

- Aucun changement de schéma ni de logique métier : on garde `ttsVoiceGender`, `ttsVoiceId`, `getDefaultVoiceForGender`, `VoiceSelectorDialog`, `VoiceCloneDialog`.
- Récupérer le nom de la voix sélectionnée depuis la liste des voix (déjà chargée pour `VoiceSelectorDialog`) ou via un petit helper.
- Pré-écoute : réutiliser le pattern de `AdminTtsCompare` / `ttsCache` (génération d'un échantillon court type « Bonjour, je suis [Nom], ravi de faire votre connaissance. ») avec un état de chargement local (icône qui passe en `Loader2`).
- Respecter les tokens du design system (pas de couleurs en dur).

### Hors scope

- Pas de modification de `VoiceSelectorDialog` ni de `VoiceCloneDialog`.
- Pas de migration DB.
- Pas de changement du flux côté entretien candidat.
