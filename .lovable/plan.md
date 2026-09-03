# Excel : comment fonctionne exactement le scoring Interw

Objectif : un classeur Excel unique, mi-commercial mi-technique, qui documente de bout en bout ce qui est envoyé à l'IA, dans quel ordre, et comment la note est calculée. Prompts inclus en version intégrale. Document de référence pour répondre aux objections clients.

## Réponses courtes (déjà vérifiées dans le code)

- **Transcription : pas en une fois.** Elle est faite réponse par réponse. Chaque réponse candidat est un fichier média séparé, transcrit individuellement, avec horodatage à la seconde. Il n'y a donc pas de diarisation à faire : chaque fichier ne contient qu'une seule voix, celle du candidat.
- **Les questions posées à l'oral ne sont jamais transcrites.** Le système les connaît déjà : ce sont les textes rédigés par le recruteur lors de la création du poste. Ces textes sont envoyés à l'IA tels quels. Aucun média du côté IA/recruteur n'est envoyé à un modèle. Seuls les médias du candidat sont analysés.
- **Les critères sont envoyés en texte,** avec leur intitulé, leur poids et leur description, dans le prompt de notation et dans celui de la matrice.
- **La note finale est une moyenne 50/50** entre la note globale attribuée par l'IA et la moyenne des critères pondérée par leurs poids.
- **La matrice ne produit pas la note.** Elle sert uniquement de grille de lecture.
- **L'expression orale et l'attitude ne comptent pas dans la note.** Elles sont analysées après coup, à part, et affichées séparément.

## Contenu du classeur

**1. Synthèse** — Le pipeline en une page : les 7 étapes, ce qui entre, ce qui sort, quel modèle, et ce qui compte ou non dans la note.

**2. Étapes détaillées** — Une ligne par étape (file d'attente, transcription, contrôles de sécurité, rapport, matrice, analyses annexes, e-mail), avec : déclencheur, données lues, données envoyées à l'IA, modèle, résultat, comportement en cas d'échec.

**3. Transcription** — Découpage par réponse, format d'horodatage, limite de taille (18 Mo par segment, 8 segments par passage), statuts possibles, absence de diarisation et pourquoi, langue.

**4. Ce qui est envoyé à l'IA** — Inventaire exhaustif, champ par champ : intitulé du poste, nom du candidat, liste numérotée des questions et leur type, critères (intitulé, poids, échelle, description), transcription intégrale, liste des réponses candidat avec identifiants pour les citations. Et en miroir : ce qui n'est jamais envoyé.

**5. Prompts (verbatim)** — Texte intégral des prompts : transcription, rapport (système + utilisateur), matrice, expression orale, attitude. Utile pour prouver les garde-fous (interdiction d'inventer une citation, interdiction du jargon, clause conformité IA Act).

**6. Calcul de la note** — Les formules écrites en clair et sous forme de cellules Excel calculables, avec un exemple chiffré à 4 critères que le client peut modifier pour voir la note bouger. Contient : la moyenne pondérée des critères, la moyenne 50/50 avec la note IA, la grille de notation par question (1-3 / 4-6 / 7-8 / 9-10), la conversion vers les anciennes échelles sur 5 ou 10, et le fait que la recommandation est décidée par l'IA et non par un seuil.

**7. Matrice question × critère** — Comment chaque case est notée, la règle « pas de preuve = non évalué et exclu de la moyenne », le calcul des moyennes de colonne, et le fait que la matrice n'écrase pas la note.

**8. Fiabilité et garde-fous** — Blocage si pas d'enregistrement, blocage si transcription trop courte au regard de la durée, réparation ciblée d'un critère mal justifié, chaîne de secours à trois tentatives (deux fois Gemini, puis GPT en secours), file d'attente avec reprise des travaux bloqués.

**9. Conformité et objections** — Tableau à deux colonnes : l'objection client d'un côté, la réponse factuelle avec la preuve technique de l'autre. Couvre : « l'IA décide toute seule », « vous analysez le visage », « la note est une boîte noire », « et si la transcription rate », « pourquoi mes critères ne sont pas respectés », « l'IA compare-t-elle les candidats entre eux » (non : chaque candidat est évalué seul, sans référence aux autres).

**10. Modèles et données** — Modèles utilisés à chaque étape, hébergement, ce qui est stocké, durée de conservation des vidéos.

## Mise en forme

Police Arial, en-têtes sur fond noir texte blanc (charte Interw), colonnes larges avec retour à la ligne, une couleur d'accent pour distinguer les onglets métier des onglets techniques. Onglet 6 avec les vraies formules Excel, entrées en bleu et calculs en noir, pour que le classeur reste manipulable. Zéro erreur de formule vérifiée avant livraison.

## Précisions techniques

- Sources : `transcribe-session`, `generate-report`, `generate-fit-matrix`, `analyze-paraverbal`, `analyze-nonverbal`, `process-report-queue`, `_shared/ai-models.ts`. Chaque affirmation du classeur porte sa référence fichier + ligne.
- Deux points à vérifier avant rédaction : la formule exacte de reprise des travaux en échec (dans les migrations) et les contraintes de la colonne `weight` (les poids ne sont pas normalisés à 100 dans le calcul, c'est une vraie moyenne pondérée).
- Le classeur est un livrable unique déposé dans les documents. Aucune modification du code de l'application.
