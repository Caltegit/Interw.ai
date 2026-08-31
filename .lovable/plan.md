# Migration ElevenLabs → Mistral (Voxtral TTS)

## Ce qu'ElevenLabs fait aujourd'hui, exactement

Vérifié dans le code et en base :

- **Voix IA de l'entretien** : générées **en direct**, phrase par phrase, pendant l'entretien du candidat. Rien n'est stocké. Le cache (`ttsCache.ts`) est en mémoire du navigateur et ne garde que quelques phrases de transition.
- **Clonage de voix** : `clone-voice` envoie un échantillon à ElevenLabs, qui renvoie un identifiant stocké dans `profiles.cloned_voice_id`. La voix clonée vit **chez ElevenLabs**, pas chez nous.
- **Transcription (STT)** : ElevenLabs n'est **pas** utilisé. C'est Gemini. Rien à migrer de ce côté.
- **Audios enregistrés à la main** (intro audio, questions audio dans le stockage) : ce sont des enregistrements humains uploadés, **pas** de l'ElevenLabs. Aucun impact.

## État actuel en base

| Élément | Nombre |
|---|---|
| Postes en voix ElevenLabs | 109 (dont 95 actifs) |
| Postes en voix navigateur | 15 |
| Modèles d'entretien en ElevenLabs | 1 (sur 1002) |
| Voix clonées existantes | 10 |
| Identifiants de voix ElevenLabs distincts utilisés | 16 |

Une seule voix concentre l'usage : 67 postes sur 109.

## Réponses directes à tes questions

**Le lien candidat change-t-il ?** Non. Le jeton de session et l'URL du poste n'ont aucun lien avec la voix. Aucun lien déjà envoyé ne sera cassé.

**Les postes actifs sont-ils compromis ?** Oui, si on ne fait rien : les 109 postes stockent un identifiant de voix **ElevenLabs** (`ICk609TItINMseDpChFt`, etc.). Ces identifiants n'existent pas chez Mistral. Sans correspondance, la voix IA échouerait et l'entretien retomberait sur la voix du navigateur — audible, mais nettement moins bonne. C'est le point de vigilance principal, et il se règle par une table de correspondance appliquée en base avant la bascule.

**Les voix clonées ?** C'est le vrai point dur. Les 10 voix clonées vivent chez ElevenLabs et **ne sont pas transférables** : Mistral fonctionne en clonage « zéro-shot » (on lui fournit un échantillon audio à chaque usage plutôt qu'une voix pré-enregistrée chez lui). Il faut donc soit reconstruire le mécanisme (stocker l'échantillon audio de référence chez nous et le passer à chaque génération), soit redemander aux 10 personnes de réenregistrer, soit garder ElevenLabs uniquement pour le clonage. Décision produit à prendre — voir les options en fin de plan.

## Impacts détaillés

### Ce qui casse si on ne fait rien
- Les 109 identifiants de voix stockés deviennent invalides.
- Le catalogue de voix proposé à la création d'un poste (`VoiceSelectorDialog`) liste des voix ElevenLabs codées en dur.
- La contrainte de base n'autorise que `browser` et `elevenlabs` comme fournisseur : il faut l'élargir avant tout.
- Les 10 voix clonées cessent de fonctionner.
- Les tests automatisés d'entretien simulent des réponses ElevenLabs.

### Ce qui n'est pas impacté
- Liens candidats, sessions en cours, jetons.
- Transcription, scoring, rapports, matrice.
- Audios et vidéos d'intro enregistrés à la main.
- Sessions déjà passées et leurs enregistrements.

### Risque de qualité à valider avant bascule
La voix est générée en direct pendant l'entretien : la **latence du premier son** conditionne le confort du candidat. L'implémentation actuelle diffuse le flux au fur et à mesure et pré-charge la phrase suivante. Il faut confirmer que Voxtral offre un temps de réponse comparable en français, sinon l'expérience se dégrade même si la voix est belle.

## Plan d'exécution

### Étape 0 — Prérequis (avant tout code)
- Ajouter la clé API Mistral (aucune n'est configurée aujourd'hui).
- Vérifier sur un test réel : qualité du français, latence du premier son, prise en charge du streaming, et le mode de clonage.

### Étape 1 — Ouvrir le fournisseur en base
Élargir la contrainte pour accepter `voxtral` en plus de `browser` et `elevenlabs`. Rien ne bascule à ce stade : les deux fournisseurs coexistent.

### Étape 2 — Nouvelle fonction de synthèse
Créer `tts-voxtral` sur le même contrat d'entrée/sortie que l'existante (texte + poste, réponse audio en flux), avec repli sur la voix navigateur en cas d'échec. `tts-elevenlabs` reste en place et intacte.

### Étape 3 — Aiguillage à double fournisseur
L'entretien choisit la fonction selon le fournisseur du poste. Un poste en `elevenlabs` continue avec ElevenLabs, un poste en `voxtral` passe par Mistral. Aucune bascule forcée : les deux tournent en parallèle.

### Étape 4 — Nouveau catalogue de voix
Remplacer les voix codées en dur par le catalogue Voxtral (aperçu audio inclus) pour les nouveaux postes, et établir la **table de correspondance** ancienne voix → nouvelle voix pour les 16 identifiants existants.

### Étape 5 — Validation sur un poste témoin
Basculer un seul poste non critique en `voxtral`, passer un entretien complet de bout en bout, comparer voix, latence et enchaînement des relances.

### Étape 6 — Bascule des postes existants
Appliquer la correspondance aux 109 postes (95 actifs) en une opération unique. Les archivés peuvent être basculés aussi, sans risque.

### Étape 7 — Voix clonées
Traiter les 10 voix selon l'option retenue ci-dessous.

### Étape 8 — Retrait d'ElevenLabs
Une fois tout stable pendant quelques jours : suppression des fonctions ElevenLabs, de la clé API, et mise à jour des mentions ElevenLabs dans les textes de consentement et les paramètres.

## Décision à prendre : les voix clonées

| Option | Ce que ça implique |
|---|---|
| **A. Reconstruire le clonage sur Voxtral** | On stocke l'échantillon audio de référence dans notre stockage et on le transmet à chaque génération. Il faut redemander un enregistrement aux 10 personnes. Nouveau consentement à recueillir. |
| **B. Garder ElevenLabs pour le seul clonage** | Voxtral pour les voix du catalogue, ElevenLabs conservé pour les 10 voix clonées. Aucune rupture, mais deux fournisseurs à maintenir et deux factures. |
| **C. Abandonner le clonage** | Les 10 voix repassent sur une voix du catalogue. Le plus simple, mais on perd une fonctionnalité différenciante. |

## Ce que je ne peux pas encore garantir

- La latence réelle de Voxtral en français, non testée.
- La qualité perçue face à ElevenLabs sur des phrases d'entretien.
- Le coût comparé par minute générée.

Ces trois points se tranchent à l'étape 0, avant toute écriture de code.

## Prochaine action

Dis-moi quelle option tu retiens pour les voix clonées (A, B ou C) et je peux démarrer l'étape 0 dès que la clé Mistral est disponible.
