# Lot 2 — Dernière étape : basculer le stockage en privé

## Où on en est

Le lot 1 (données candidats) est terminé et vérifié. Pour le lot 2 (enregistrements vidéo) :

- Les deux fonctions serveur sont déployées : une qui sert les images de vitrine (liste stricte de dossiers), une qui délivre les liens temporaires (1 h) vers les enregistrements après contrôle des droits.
- Les fonctions d'analyse (transcription, rapports, réparation) lisent désormais directement depuis le stockage, plus par adresse publique.
- Les lecteurs vidéo, l'export, les extraits et les rapports partagés passent par les liens temporaires.
- Les adresses des images de vitrine en base (418 adresses : logos, avatars, vidéos de question, pages publiques) ont été réécrites pour passer par le serveur.

## Ce qui reste à faire

1. Basculer l'espace de stockage « media » en privé (une action, réversible).
2. Vérifier ensuite, en navigateur de test :
   - les images publiques (logos, avatars, vidéos de question) s'affichent toujours ;
   - l'ancienne adresse publique d'un enregistrement renvoie une erreur au lieu de la vidéo ;
   - un recruteur connecté lit les vidéos ; un inconnu non ;
   - le parcours candidat et le back-office fonctionnent comme avant.

Si un problème apparaît, la bascule est annulable immédiatement.

## Détails techniques

- `supabase--storage_update_bucket(name="media", public=false)` — le 115 Go d'enregistrements devient inaccessible publiquement sans déplacer aucun fichier.
- Contrôles : capture navigateur de la page d'une session (vidéo lue en lien signé), d'une page publique de poste (images visibles), requête anonyme sur une ancienne adresse d'enregistrement (doit renvoyer 400/403/404).
