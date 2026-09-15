# Réparer les petites photos rondes dans la liste des candidats

## Ce que j'ai vérifié

Sur les entretiens terminés :

- **143** n'ont aucune photo enregistrée : le rond affiche les initiales.
- **18** ont bien une image dans le stockage, mais l'entretien ne la référence pas : le rond reste vide alors que la photo existe.
- **106** entretiens récents référencent encore l'ancienne adresse publique (le stockage est privé depuis la correction de sécurité). L'application sait la convertir, mais **chaque ligne** de la liste demande son propre lien sécurisé : 25 demandes en parallèle pour une page de 25 candidats, d'où des ronds vides ou très lents.
- Le service qui délivre ces liens **n'accepte aujourd'hui qu'un seul entretien par demande** : c'est ce qui empêche de tout charger en une fois.
- Aucune image référencée n'est manquante dans le stockage : rien n'est perdu.

## Ce que je corrige

1. **Un seul appel pour toute la page** : le service accepte plusieurs entretiens à la fois, avec le même contrôle des droits qu'aujourd'hui (appartenance à l'organisation, ou super administrateur). Les ronds s'affichent ensemble.
2. **Remettre les 106 adresses au bon format** (chemin interne au lieu de l'ancienne adresse publique), comme déjà fait pour les vidéos.
3. **Rebrancher les 18 photos orphelines** : l'image existe, il suffit de la référencer.
4. **Photo manquante** : à la première ouverture de la fiche d'un candidat, une image est extraite de la vidéo déjà chargée et enregistrée une fois pour toutes. Tant qu'il n'y en a pas, les initiales restent affichées.

## Impact

**Rien ne casse pour le candidat** : aucun fichier touché dans le parcours d'entretien, aucun changement d'enregistrement, de scoring, de rapport ni de transcription.

Côté recruteur :

- Liste des candidats : les ronds s'affichent plus vite et moins de ronds vides. Aucune autre colonne modifiée.
- Fiche candidat : un envoi d'image en arrière-plan à la première ouverture, invisible et sans blocage ; s'il échoue, on garde les initiales.

Points de vigilance, avec leur garde-fou :

- Le service `get-interview-media-url`, qui délivre les liens temporaires des vidéos d'entretien, est aussi utilisé pour les photos de la liste. Je vais l'étendre pour accepter un lot de plusieurs entretiens (au lieu d'un seul) : cela permet de demander toutes les miniatures d'une page en un seul appel. Le fonctionnement actuel pour les vidéos (un seul entretien à la fois) restera strictement identique, et je vérifierai qu'une vidéo se lit toujours après la modification.
- Correction des adresses en base : seules les lignes de photo (`thumbnail_url`) sont concernées, les vidéos ne sont pas touchées ; opération réversible, chaque valeur d'origine étant reconstructible.
- Aucune migration de structure : pas de changement de table, donc pas de risque sur les autres pages.

## Détails techniques

- `get-interview-media-url` : autoriser un lot couvrant plusieurs sessions, avec vérification des droits session par session ; comportement mono-session inchangé.
- `ProjectDetail.tsx` : résolution groupée via `useMediaUrls` sur les `thumbnail_url` de la page affichée ; `SessionVideoThumb` accepte une adresse déjà résolue et garde son repli initiales.
- Données (`run_sql`, pas de migration) : normalisation de `sessions.thumbnail_url` et remplissage des 18 références depuis `storage.objects`.
- Génération paresseuse de la vignette dans la fiche session (capture d'une image de la vidéo, envoi vers `interviews/<id>/thumbnail.jpg`).

## Vérifications avant de te rendre la main

- Contrôle de type et tests existants au vert.
- Capture d'une page de liste de 25 candidats : ronds affichés en un seul chargement.
- Lecture d'une vidéo d'entretien vérifiée après modification du service de liens.
- Un entretien sans image garde ses initiales, sans erreur.

## Nouvelle règle retenue

Chaque plan comportera désormais cette section « Impact » : ce qui peut casser, ce que voient le recruteur et le candidat.
