## Objectif

Aligner les libellés affichés dans le sélecteur de voix ElevenLabs sur la **réalité** de chaque ID (vrai prénom + vrai genre + vraie langue), corriger les défauts incohérents et ajouter un pictogramme de langue/accent pour éviter de futures confusions.

## Constat (vérifié via API ElevenLabs)

| ID actuel | Affiché | Réel | À faire |
|---|---|---|---|
| kENkNtk0xyzG09WW40xE | 🚺 Marine | Marcel — homme FR | → groupe Hommes, "Marcel" |
| 1a3lMdKLUcfcMtvN772u | 🚺 Adeline | Antoine — homme FR parisien | → groupe Hommes, "Antoine" |
| ICk609TItINMseDpChFt | 🚺 Léa | Léa formatrice — femme FR | OK |
| WeAAwKYcS06VmXw086yZ | 🚺 Victoria | Victoria — femme FR | OK |
| XB0fDUnXU5powFXDhCwa | 🚺 Charlotte | Helen — femme EN-britannique | → "Helen 🇬🇧" |
| IPgYtHTNLjC7Bq7IPHrm | 🚹 Martin | Alexandre — homme FR québécois | → "Alexandre 🇨🇦" |
| AZnzlk1XvdvUeBnXmlld | 🚹 Guillaume | Elara — femme EN-américaine | → groupe Femmes, "Elara 🇺🇸" |
| jbJMQWv1eS4YjQ6PCcn6 | 🚹 Julien | Gülsu — femme turque | → groupe Femmes, "Gülsu 🇹🇷" |
| hgPNbZ1myT05ziSdrji2 | 🚹 Clément | Clément — homme FR | OK |
| 0igQGE0lbNpTaWsexf1r | 🚹 Paul K | Paul K — homme FR | OK |
| jsScnYkNNda9Q1NES5nn | 🚹 Léo | Léo — homme FR | OK |
| JBFqnCBsd6RMkjVDRZzb | 🚹 George | George — homme EN-britannique | → "George 🇬🇧" |

## Changements

### 1. `src/components/project/VoiceSelectorDialog.tsx`

Réorganiser les listes :

```ts
FEMALE_VOICES = [
  { id: "ICk609TItINMseDpChFt", name: "Léa", description: "FR · posée, pédagogue" },
  { id: "WeAAwKYcS06VmXw086yZ", name: "Victoria", description: "FR · chaleureuse, posée" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Helen", description: "EN 🇬🇧 · accent britannique" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Elara", description: "EN 🇺🇸 · narratrice claire" },
  { id: "jbJMQWv1eS4YjQ6PCcn6", name: "Gülsu", description: "TR 🇹🇷 · turc Istanbul" },
];

MALE_VOICES = [
  { id: "kENkNtk0xyzG09WW40xE", name: "Marcel", description: "FR · French touch" },
  { id: "1a3lMdKLUcfcMtvN772u", name: "Antoine", description: "FR · parisien, emphase" },
  { id: "IPgYtHTNLjC7Bq7IPHrm", name: "Alexandre", description: "FR 🇨🇦 · accent québécois" },
  { id: "hgPNbZ1myT05ziSdrji2", name: "Clément", description: "FR · neutre" },
  { id: "0igQGE0lbNpTaWsexf1r", name: "Paul K", description: "FR · pédagogue, agréable" },
  { id: "jsScnYkNNda9Q1NES5nn", name: "Léo", description: "FR · énergique, engageant" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "EN 🇬🇧 · narrateur captivant" },
];
```

Changer les défauts pour de vraies voix FR métropolitaines :
```ts
FEMALE_VOICE_DEFAULT_ID = "ICk609TItINMseDpChFt"; // Léa (inchangé, déjà OK)
MALE_VOICE_DEFAULT_ID   = "0igQGE0lbNpTaWsexf1r"; // Paul K (au lieu d'Alexandre QC)
```

### 2. `src/pages/ProjectNew.tsx`

Le `initialState` initialise `ttsVoiceId` via `getDefaultVoiceForGender("female")` — déjà OK, n'aura plus besoin d'être touché.

### 3. Projets existants — migration de données

Sur les **30 projets** qui pointent aujourd'hui sur `XB0fDUnXU5powFXDhCwa` (Helen anglaise) avec genre `female` : il s'agit de l'ancien défaut. Les remettre sur Léa (Léa = vraie voix FR femme) :

```sql
UPDATE projects
SET tts_voice_id = 'ICk609TItINMseDpChFt'
WHERE tts_voice_id = 'XB0fDUnXU5powFXDhCwa'
  AND tts_voice_gender = 'female';
```

Aucun changement pour les autres IDs (utilisateurs ayant choisi explicitement une voix : on respecte leur choix, même si elle est désormais reclassée).

## Hors scope

- Les IDs `udpVhpVWGxVGfQz1G93K`, `McVZb7PHIyDsbVBnY1aP`, `nPczCjzI2devNBz1zQrb`, `cgSgspJ2msm6clMCkdW9`, `FwbKtYZXEftC61m0pGPu` présents dans certains projets viennent probablement de voix clonées ou de sélections antérieures hors-liste : on n'y touche pas.
- Pas d'ajout de nouvelles voix FR — uniquement correction.
