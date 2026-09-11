# Pourquoi A Perry obtient 75/100 malgré un français difficile

## Ce que j'ai vérifié sur cette session

- La note vient de **trois critères notés « solides »** : Expression orale 80, Ton et attitude 78, Cadre et présentation 75. Moyenne pondérée = 75/100, grade B, « recommandé ».
- La justification retenue pour l'expression orale est : *« Français soigné, phrases bien construites et compréhensibles sans effort. »*
- Le texte sur lequel l'IA a travaillé tient en trois phrases : *« Bonjour, je m'appelle Thierry. J'aime beaucoup la lecture, la cuisine et me promener en plein air. Je suis ravi de vous rencontrer et de vous accompagner au quotidien. À bientôt ! »*
- Aucune analyse de la voix n'a alimenté la note : le seul contrôle audio effectué est un test technique (« la piste n'est pas silencieuse »), sans mesure de débit, d'hésitations ni d'intelligibilité.

## L'explication

Le score est calculé **uniquement à partir du texte transcrit**, jamais à partir de la voix.

Deux effets se cumulent :

1. **La transcription nettoie le discours.** Le moteur de transcription restitue un français corrigé : il rétablit la grammaire, supprime les hésitations, les répétitions et les mots mal prononcés. Un candidat difficilement compréhensible à l'oral ressort donc en texte parfaitement propre.
2. **L'IA de notation ne voit que ce texte propre.** Sur un critère comme « Expression orale », elle juge donc la syntaxe écrite, pas la prononciation, le débit, l'accent ou la fluidité. D'où le commentaire « compréhensible sans effort », qui est vrai du texte et faux de la vidéo.

Le contenu très court (une dizaine de secondes exploitables) n'a pas non plus fait baisser la note, alors qu'il apporte peu d'éléments.

## Ce que je peux corriger

**Option A — Transcription verbatim (modifie le prompt de transcription uniquement).**
Demander au moteur de transcrire mot à mot, en conservant hésitations, répétitions, mots inachevés et passages inaudibles. L'IA de notation verrait alors un texte qui reflète mieux la difficulté réelle. Limite : l'accent reste invisible.

**Option B — Indicateurs de fluidité orale (mesure sur l'audio déjà stocké).**
Mesurer des signaux objectifs à partir de la piste audio : débit moyart, durée et nombre de pauses, proportion de silences longs, mots incompréhensibles, faux départs. Ces indicateurs nourriraient le critère « Expression orale » sans identifier la personne ni prétendre analyser ses émotions.

**Option C — Notation directement sur la vidéo/audio par le modèle.**
Faire écouter l'enregistrement au modèle de notation en même temps que le texte. Le plus fidèle, mais le plus coûteux, le plus lent et le plus exposé du point de vue réglementaire (car le modèle peut interpréter l'accent).

## Point de vigilance réglementaire

L'évaluation de la prononciation ou de l'accent peut devenir un critère indirect de discrimination à l'embauche (origine, lieu de résidence, handicap). Ce n'est pas, en soi, de la biométrie au sens AI Act (on n'identifie pas la personne), mais c'est une zone sensible.

La voie la plus sûre reste l'**option B restreinte à des indicateurs de fluidité professionnelle** :
- pas de reconnaissance du locuteur,
- pas d'inférence sur les émotions,
- pas de note sur l'accent,
- descriptifs factuels plutôt qu'une note automatique,
- mention transparente pour le candidat.

## Périmètre proposé

- Activer ce complément audio **uniquement** pour le poste Tango « Vidéo de présentation ».
- Ne pas toucher aux autres organisations ni aux autres projets.
- Ajouter une option en paramètre du projet : « Inclure une évaluation de la fluidité orale ».
- Recalculer les 41 candidats Tango déjà importés uniquement si tu confirmes.

## Questions avant d'implémenter

1. Quelle option tu préfères : A, B ou C ?
2. Veux-tu limiter cela au seul projet Tango « Vidéo de présentation », ou l'ouvrir à tous les projets avec un interrupteur ?
3. Faut-il recalculer les candidats déjà importés, ou appliquer la règle uniquement aux nouveaux ?
4. Veux-tu ajouter une mention visible pour le candidat dans l'e-mail d'invitation et/ou l'écran d'accueil ?
5. As-tu consulté ton conseil juridique interne ? Je peux documenter le raisonnement technique, mais je ne peux pas valider la conformité.
