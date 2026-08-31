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

### Étape 7 — Voix clonées : option A retenue

**Périmètre réel** (vérifié en base) : 10 voix clonées, dont **6 seulement sont utilisées** sur **14 postes** (13 actifs).

| Voix | Personne | Postes |
|---|---|---|
| Marie | marie.paquer@ads-up.fr | 4 actifs |
| Eva | hello@techsolidaire.com | 3 actifs |
| Alexis | alexis.grould@youswitch.co | 2 actifs |
| Olivier Kellermann | olivier.kellermann@qwartz-conseil.fr | 2 actifs |
| Alteresco | clement.alteresco@gmail.com | 1 actif + 1 archivé |
| Anaëlle | anaelle.morin@castalie.com | 1 actif |
| Indy, Benjamin, François Levy, Mach | interne / inactifs | 0 |

Les 4 voix sans poste ne demandent aucune action de rattrapage : on les invite simplement à réenregistrer si elles reviennent.

**Ce qu'on construit (option A — clonage reconstruit sur Voxtral)**
1. Stockage : un espace privé pour les échantillons de voix, un fichier par personne, accessible uniquement par la fonction de synthèse.
2. Base : sur le profil, on garde le nom de la voix et on ajoute la référence de l'échantillon et la date de consentement ; l'ancien identifiant ElevenLabs reste conservé jusqu'au retrait complet.
3. Enregistrement : l'écran de clonage n'envoie plus rien à ElevenLabs, il enregistre l'échantillon chez nous après recueil du consentement.
4. Synthèse : `tts-voxtral` joint l'échantillon de référence à chaque génération pour les postes en voix clonée, avec mise en cache côté fonction pour éviter de recharger l'échantillon à chaque phrase.
5. Suppression : le bouton de suppression efface l'échantillon du stockage (droit à l'effacement conservé).

**Séquence de bascule pour les 6 personnes concernées**
- Tant qu'une personne n'a pas réenregistré, ses postes **restent sur ElevenLabs**. Aucune coupure.
- Un message leur est envoyé avec le lien vers l'écran de clonage ; réenregistrement en une minute.
- Dès le nouvel échantillon reçu, ses postes basculent en `voxtral`.
- Après un délai à définir, les postes restés sans échantillon repassent sur une voix du catalogue plutôt que d'échouer.

**Risque à valider à l'étape 0** : fidélité du clonage zéro-shot de Voxtral face à ElevenLabs, et latence quand l'échantillon est joint à chaque requête. C'est le point qui peut faire renoncer à l'option A.

### Étape 8 — Retrait d'ElevenLabs
Une fois tout stable pendant quelques jours : suppression des fonctions ElevenLabs, de la clé API, et mise à jour des mentions ElevenLabs dans les textes de consentement et les paramètres.

## Ce que je ne peux pas encore garantir

- La latence réelle de Voxtral en français, non testée.
- La qualité perçue face à ElevenLabs sur des phrases d'entretien.
- Le coût comparé par minute générée.

Ces trois points se tranchent à l'étape 0, avant toute écriture de code.

## Prochaine action

Fournir la clé API Mistral pour lancer l'étape 0 (test de qualité, latence et clonage zéro-shot).

