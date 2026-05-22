## Objectif
Faire en sorte que **Dupliquer** crée un nouveau projet totalement indépendant, avec une copie fidèle de :
- **1. Infos du projet**
- **2. Introduction**
- **3. Questions**
- **4. Critères**

## Cause repérée
Le bouton **Dupliquer** s’appuie aujourd’hui sur un objet `project` chargé de façon **partielle** dans `ProjectDetail.tsx`.
Du coup, plusieurs colonnes du projet ne sont jamais relues avant insertion, et la copie repart avec des valeurs par défaut ou vides, notamment sur l’introduction et certains réglages.

## Plan
1. **Relire la source complète avant duplication**
   - Au clic sur **Dupliquer**, recharger le projet source avec tous les champs nécessaires au lieu d’utiliser l’état partiel de la page.
   - Conserver uniquement les champs qui doivent réellement être différents sur la copie : nouvel `id`, nouveau `slug`, nouveau `created_by`, titre suffixé en `(copie)`.

2. **Copier fidèlement toutes les infos du projet**
   - Reprendre l’ensemble des réglages utilisés par la création/édition : langue, durée, audio/vidéo, pause, passer question, messages, voix, IA, intro, médias, statut attendu, etc.
   - Éviter toute valeur par défaut qui écraserait la configuration source si le champ existe déjà.

3. **Copier l’introduction sans perte**
   - Reprendre exactement les champs liés à l’intro : activation, mode, texte, audio, vidéo, voix TTS, premier écran, textes IA associés si concernés.
   - Vérifier que les URLs de médias pointent bien vers la copie logique attendue sans casser le projet d’origine.

4. **Copier questions et critères proprement**
   - Conserver l’ordre, les textes, médias, hints, relances, durées max, avatar, et les associations `scoring_criteria_ids`.
   - Refaire le mapping ancien critère → nouveau critère pour que le projet dupliqué soit cohérent et indépendant.

5. **Rendre la copie indépendante du projet source**
   - Vérifier que le nouveau projet référence bien son propre `project_id` partout.
   - S’assurer qu’aucune modification future sur les questions/critères dupliqués n’impacte l’original.

6. **Vérifier avant de te dire que c’est corrigé**
   - Ajouter au minimum un contrôle ciblé sur le flux de duplication, ou à défaut une vérification manuelle stricte dans le code.
   - Tester le scénario : projet source complet → duplication → comparaison champ par champ entre original et copie pour les infos, l’intro, les questions et les critères.

## Détail technique
Fichier principal à corriger :
- `src/pages/ProjectDetail.tsx`

Approche prévue :
- remplacer la duplication basée sur l’état local partiel par une duplication basée sur un `select` complet du projet source ;
- aligner la liste des champs dupliqués sur ceux utilisés dans `ProjectNew.tsx` et `ProjectEdit.tsx` ;
- conserver le remapping des critères vers les questions, déjà présent, mais le fiabiliser autour d’une source complète.

## Résultat attendu
Quand tu cliques sur **Dupliquer**, le nouveau projet doit être un **copier-coller complet** du précédent, sauf son identité propre (id, slug, auteur, titre suffixé), et rester **100 % indépendant** du projet d’origine.