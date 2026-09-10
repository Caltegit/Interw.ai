# Corriger le scoring des candidats importés (Tango)

## Réponse au challenge : oui, c'est la bonne idée

Avec le plan précédent, oui, il y avait des règles spécifiques à Tango écrites dans le code (l'identifiant du poste dans les conditions). Ta proposition les élimine presque toutes :

**Si le poste « Vidéo de présentation » ne contient qu'une seule question générale de présentation, alors un candidat qui envoie une vidéo libre a, par construction, répondu à toutes les questions posées.** L'entretien importé devient un entretien ordinaire à une question :

- le transcript complet devient la réponse à cette question unique — plus de découpe, plus rien de jeté ;
- la note par question note la seule question posée — plus de 3/10 sur des questions jamais posées ;
- la matrice affiche une ligne × trois critères, avec la pondération du poste — c'est déjà le comportement standard.

Comme demandé, **aucune modification de code** n'est prévue ; l'analyse orale reste bloquée sur un extrait minimum.

Les limites à connaître, pour que tu décides en connaissance de cause :
- les cinq questions actuelles du poste sont remplacées par la question unique — l'historique des neuf fiches est recalculé sur cette base ;
- la matrice n'a plus qu'une ligne : la comparaison question par question disparaît pour ce poste ;
- les autres postes de Tango et des autres organisations gardent leurs questions et le fonctionnement actuel, sans exception.

## Ce que je vais faire

### A. Une seule question générale sur le poste Tango
- Remplacer les cinq questions de « Vidéo de présentation » par une seule : « Présente-toi : parcours, motivations et ce que tu apporterais aux personnes accompagnées. » (libellé exact à valider par toi — voir question ci-dessous.)
- Les trois critères et leur pondération (35 / 35 / 30) restent inchangés.

### B. Import simplifié
- L'import rattache le transcript complet à cette question unique, sans découpe ni segmentation.
- Une seule réponse par candidat : vidéo + transcript intégral.

### C. Recalculer les neuf fiches déjà importées
- Relancer transcription complète, notation et matrice sur les neuf candidats, sans retélécharger les vidéos et sans envoyer aucun e-mail.

### Détails techniques
- `supabase/functions/import-external-candidates/index.ts` : suppression de `splitTranscript`, rattachement à la question unique du poste.
- `supabase/functions/generate-report/index.ts` : aucune modification — le parcours standard note la seule question posée, le rattrapage d'entrées vides ne se déclenche plus.
- `supabase/functions/generate-fit-matrix/index.ts` : aucune modification — une ligne, trois critères, pondération du poste.
- Données : archivage des cinq questions actuelles, création de la question unique, relance des neuf sessions `end_reason = 'imported_external'`.
- Vérification : un entretien d'un autre projet garde ses données telles quelles ; aucun e-mail envoyé.

## Question ouverte

Le libellé exact de la question unique, ainsi que son titre court affiché dans la fiche (propositions : « Présentation » pour le titre, et le libellé ci-dessus pour le corps).
