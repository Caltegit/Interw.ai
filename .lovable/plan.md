# Passage d'ElevenLabs à Mistral (Voxtral)

Deux briques audio changent de fournisseur : la synthèse vocale (lecture des questions par l'IA) et la transcription des entretiens. En plus, la règle produit change : **plus aucune voix générique** — seule la voix clonée du recruteur peut lire les questions.

## Ce que dit l'état actuel de la base

- 10 recruteurs ont une voix clonée chez ElevenLabs.
- 109 postes sont configurés en lecture vocale, dont **14 seulement** utilisent une voix clonée. Les 95 autres utilisent une voix générique du catalogue.
- 1 modèle d'entretien utilise aussi la lecture vocale.

C'est le point sensible : supprimer les voix génériques coupe la lecture vocale sur 95 postes actifs.

## 1. Règle produit : voix clonée obligatoire

- Le catalogue de 12 voix génériques disparaît complètement.
- Dans la création/édition d'un poste, l'option « questions lues par l'IA » n'est sélectionnable que si le recruteur a cloné sa voix. Sinon, l'option est désactivée avec un lien direct vers le clonage dans son profil.
- Le sélecteur de voix devient un simple affichage : « Votre voix — [nom] », plus de liste.
- Postes existants sans voix clonée (95) : ils basculent en questions écrites (pas de lecture vocale), et le propriétaire voit un bandeau l'invitant à cloner sa voix pour réactiver la lecture. Les questions et les entretiens en cours ne sont pas affectés.

## 2. Récupération des voix des bêta-testeurs

ElevenLabs conserve l'échantillon audio d'origine de chaque voix clonée. Une fonction de migration réservée au super-admin :

1. liste les 10 profils avec une voix clonée ;
2. télécharge l'échantillon d'origine depuis ElevenLabs ;
3. le range dans un espace de stockage privé (pour ne plus jamais dépendre d'un fournisseur) ;
4. recrée la voix chez Mistral et enregistre le nouvel identifiant.

Point à vérifier en premier : que l'échantillon soit bien téléchargeable pour ces 10 voix. Si un échantillon manque, le recruteur concerné est listé et devra réenregistrer 30 secondes — l'écran de clonage existant suffit.

## 3. Synthèse vocale — Voxtral TTS

- Nouvelle fonction serveur `tts-mistral` qui remplace `tts-elevenlabs`, même contrat d'entrée/sortie (flux MP3), donc aucun changement dans le déroulé de l'entretien.
- Le clonage passe par la création d'une voix Mistral réutilisable ; l'échantillon est aussi conservé de notre côté.
- La suppression de voix supprime chez Mistral et dans le stockage.
- Le cache de phrases de transition et le préchargement actuels restent tels quels.

## 4. Transcription — Voxtral Mini Transcribe V2

- `transcribe-session` passe de Gemini à Voxtral, qui rend nativement des horodatages mot à mot (donc des segments plus fiables que ceux devinés aujourd'hui).
- L'audio est envoyé en fichier plutôt qu'encodé dans un message ; supporte jusqu'à 3 heures, ce qui supprime le découpage en segments actuel.
- Les horodatages alimentent déjà la matrice de fit (« Q5 · 1:15 ») : le format de sortie reste identique pour ne rien casser en aval.
- Repli : si Voxtral échoue, on retombe sur le chemin Gemini actuel pendant la période de validation.

## 5. Bascule et nettoyage

1. Ajout de la clé API Mistral.
2. Migration des 10 voix, vérification à l'écoute.
3. Bascule TTS puis transcription, avec repli actif.
4. Après validation : suppression du code ElevenLabs, du catalogue de voix et de la clé.

## Détails techniques

- Points d'appel Mistral : `POST /v1/audio/voices` (clonage), `POST /v1/audio/speech` avec `voxtral-mini-tts-2603` en flux, `POST /v1/audio/transcriptions` avec `voxtral-mini-transcribe-2`.
- Fichiers touchés : `supabase/functions/tts-mistral` (nouveau), `clone-voice`, `delete-cloned-voice`, `transcribe-session`, `migrate-voices-to-mistral` (nouveau, super-admin) ; côté interface `VoiceSelectorDialog.tsx`, `VoiceCloneDialog.tsx`, `ProjectEdit.tsx`, `ProjectNew`, `InterviewTemplateEdit.tsx`, `IntroLibrary.tsx`, `InterviewStart.tsx`, `InterviewLanding.tsx`, `InterviewDemoLanding.tsx`, `SettingsProfile.tsx`, `AdminTtsCompare.tsx`.
- Base : ajout de `cloned_voice_provider` et `cloned_voice_sample_path` sur `profiles` ; `tts_provider` accepte `mistral` ; migration des 95 postes en voix générique vers `browser`/questions écrites.
- Nouveau seau de stockage privé pour les échantillons de voix, accessible uniquement aux fonctions serveur.
