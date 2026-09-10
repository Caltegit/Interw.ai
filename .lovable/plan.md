# Importer les 31 candidats restants (Tango — Vidéo de présentation)

Même base que les 9 fiches déjà retraitées : une seule question de présentation, transcription complète, notation sur les trois critères (35 / 35 / 30). Zéro e-mail candidat.

## Ce que je vais faire

1. **Simulation d'abord** — relire le fichier `tango_mobile_app.xlsx`, sélectionner les candidats les plus récents ayant une durée de réponse valide, écarter ceux déjà importés, et afficher la liste des 31 avant toute écriture.
2. **Import réel par lots** — traiter par lots de 10 (`--limit 10` avec `--offset`) pour éviter les dépassements de délai : récupération de la bonne vidéo (correspondance de durée à ±1 s), extraction d'une piste audio légère, création de la fiche candidat, transcription complète puis notation et matrice.
3. **Vérification** — pour chaque fiche : un seul message candidat, transcription terminée, score et matrice présents. Je signale les candidats dont la vidéo n'a pas pu être retrouvée (aucune fiche créée pour eux).
4. **Contrôle final** — confirmer qu'aucun e-mail n'a été déclenché et qu'aucun autre poste ni aucune autre organisation n'est touché.

## Détails techniques

- `scripts/import-external-candidates.ts` avec le mapping `name=Name,email=Email,phone=Phone number,media=Q1. Video/Audio URLs,duration=<colonne durée>,date=Date/Time`, `--project-id eb7db435-1f2f-4ccf-a2ff-f49d68f851db`, `--yes`.
- Les fiches sont créées avec `end_reason = 'imported_external'` et rattachées à la question `4d216e71-6948-467d-9938-9052d27affec`.
- Aucune modification de code prévue : le script et la fonction d'import sont déjà à jour (plus de découpage du transcript, sélection de la vidéo par durée).
- Le dédoublonnage par e-mail garde la réponse la plus récente et ignore les 9 candidats déjà présents.
- Aucun appel à une fonction d'envoi d'e-mail (garde-fou déjà dans le script).

## Point à confirmer

Je pars sur les 31 candidats valides les plus récents identifiés lors de la dernière simulation. Si tu veux un autre lot (plus ancien, ou un nombre différent), dis-le avant que je lance.
