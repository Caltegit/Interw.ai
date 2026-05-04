# Plan : Créer le projet "Morning, premier entretien"

Création directe en base (insertion de données, pas de changement de schéma) dans l'organisation **SUPER ADMIN**, rattaché à ton compte (`clement.alteresco@gmail.com`).

## Projet

- **Titre** : "Morning, premier entretien"
- **Organisation** : SUPER ADMIN (`a0000000-0000-0000-0000-000000000001`)
- **Créé par** : ton compte
- **Langue** : fr
- **Durée max** : 15 min (tu as dit ~10 min)
- **Statut** : `active` (lien candidat utilisable)
- **Avatar / voix IA** : valeurs par défaut (Léa, voix féminine FR, TTS browser) — tu pourras changer ensuite dans l'éditeur
- **Intro premier écran** activée (`intro_first_screen = true`, `intro_enabled = true`, `intro_mode = "text"`) avec le texte exact que tu as fourni
- **Slug** auto-généré : `morning-premier-entretien-<timestamp>`

## 12 questions (toutes type `open`, lues par l'IA, sans relance)

1. Pour commencer en douceur, comment ça va aujourd'hui ?
2. Comment as-tu découvert Morning ?
3. Pour continuer sur Morning, pourrais-tu me décrire ce qu'on propose ? Si tu devais expliquer notre service à un ami… C'est à toi.
4. Peux-tu me parler de ta dernière expérience pro ? Qu'est-ce qui t'a plu ? Qu'as-tu appris ?
5. Une question un peu plus perso : dans quel coin as-tu grandi ? Et est-ce que tu gardes un bon souvenir de ces années d'enfance ?
6. Si tu m'invites chez toi à dîner, tu prépares quoi ? Ça serait quoi l'ambiance ?
7. Tu aimes faire quoi le week-end ? As-tu des passions en ce moment ?
8. Parle-moi de tes vacances idéales. Mer ? Montagne ? Dis-moi tout.
9. D'ailleurs quand tu pars en vacances avec des amis, tu t'occupes de quoi dans le groupe ?
10. Décris-moi ta personnalité en 3 mots.
11. Si je te donnais 1 million d'euros à dépenser en 24h, tu ferais quoi ?
12. Bon j'arrête de te torturer ! Un dernier mot que tu aimerais ajouter avant qu'on se quitte ? C'est à toi.

## Critères d'évaluation

Aucun critère ajouté pour l'instant (tu pourras les définir depuis l'éditeur du projet). Si tu en veux par défaut, dis-le-moi.

## Étapes techniques

1. `INSERT` dans `projects` (organization_id SUPER ADMIN, created_by toi, intro premier écran activée avec ton texte).
2. `INSERT` des 12 lignes dans `questions` avec `order_index` 0→11.

Je te donnerai l'ID du projet créé pour ouvrir directement `/projects/<id>`.
