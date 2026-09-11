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
2. **L'IA de notation ne voit que ce texte propre.** Sur un critère comme « Expression orale », elle juge donc la syntaxe écrite, pas la prononciation, l'accent, le débit ou la fluidité. D'où le commentaire « compréhensible sans effort », qui est vrai du texte et faux de la vidéo.

Le contenu très court (une dizaine de secondes exploitables) n'a pas non plus fait baisser la note, alors qu'il apporte peu d'éléments.

## Ce que je peux corriger

Trois pistes, de la plus légère à la plus profonde. Dis-moi laquelle tu veux.

**A. Transcription fidèle (rapide).** Demander au moteur de transcrire mot à mot, en conservant hésitations, répétitions, mots inachevés et en signalant les passages inaudibles. L'IA de notation verrait alors un texte qui reflète la difficulté réelle. Effet partiel : l'accent reste invisible.

**B. Note d'intelligibilité issue de l'audio (recommandé).** Ajouter, à partir de la piste audio déjà stockée, une mesure d'élocution : clarté, débit, hésitations, proportion de passages incompréhensibles. Cette mesure alimente le critère d'expression orale plutôt que le seul texte. C'est ce qui corrige vraiment le cas présent.

**C. Notation directement sur la vidéo.** Faire écouter l'enregistrement au modèle de notation en même temps que le texte. Le plus fidèle, mais aussi le plus coûteux et le plus lent sur chaque entretien.

## Points à trancher avant de coder

- Périmètre : uniquement le poste Tango « Vidéo de présentation », ou toutes les organisations ?
- Faut-il recalculer les 41 candidats déjà importés, ou n'appliquer la règle qu'aux nouveaux ?
- En cas de doute sur l'intelligibilité, préfères-tu une note basse ou un critère marqué « à vérifier en entretien » ?

## Détails techniques

Le scoring repose sur `generate-report` et `generate-fit-matrix`, qui envoient uniquement `session_messages.content` au modèle. `analyze-paraverbal` existe mais se limite aujourd'hui à un contrôle de silence et n'écrit rien dans les critères. L'option B consisterait à étendre cette fonction (mesures d'élocution à partir de `audio_segment_url`) et à injecter son verdict comme contrainte dans le prompt du critère « Expression orale ».
