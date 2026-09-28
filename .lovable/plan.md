# Réparer la durée des vidéos WebM en masse

## Constat (vérifié en base)

- 8 687 réponses vidéo au total : **7 553 WebM** (87 %) et 1 134 MP4.
- Les WebM enregistrés par le navigateur (MediaRecorder) **n'inscrivent pas la durée** dans le fichier. Sans durée, le lecteur ne peut ni afficher « 0:20 / 1:30 » ni permettre un déplacement fiable — c'est pourquoi si peu de vidéos montrent le temps total.
- La réparation unitaire déjà faite (session Hugo Voyenet) prouve la méthode : réencapsulage ffmpeg rapide, sans réencodage, qui inscrit la durée exacte.

## Plan

1. **Réparation par lots des WebM existants** (tâche de fond, hors de l'app) :
   - Pour chaque fichier WebM du stockage : téléchargement, réencapsulage ffmpeg (`-c copy`, sans réencodage → rapide, qualité identique), vérification de la durée lue, renvoi du fichier réparé à la même place, original conservé dans `originals/`.
   - Traitement par lots (ex. 200 fichiers), en commençant par les organisations actives et les sessions récentes (30 derniers jours), puis le reste.
   - Journal d'avancement : nombre traités, réussis, échecs (fichiers illisibles laissés tels quels, originaux intacts).
2. **Empêcher le problème à la source** : à la fin de chaque enregistrement candidat, le fichier est déjà converti/réparé côté serveur quand c'est possible — vérifier que ce chemin inscrit bien la durée pour les nouvelles vidéos, et le corriger sinon.
3. **Vérification** : après le premier lot, contrôle à l'écran sur plusieurs fiches candidats (temps total affiché, déplacement dans la barre, lecture intacte), puis E2E recruteur après approbation.

## Impact

- Aucun changement visuel ni de parcours : les vidéos affichent simplement leur durée et deviennent navigables.
- Qualité vidéo inchangée (réencapsulage sans réencodage) ; originaux conservés.
- Les 1 134 MP4 ne sont pas touchés.
- Seule limite : les fichiers WebM corrompus ou illisibles resteront sans durée (ils seront listés).

## Point d'attention

Le volume (7 553 fichiers) impose un traitement par lots étalé ; les premiers résultats visibles dès le premier lot, sans attendre la fin.
