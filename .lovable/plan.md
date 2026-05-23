## Problème identifié
Sur **Aline**, le repère affiché n’est pas absurde côté calcul, mais il est **trompeur visuellement**.

- **`Q8`** vient du fait que le projet contient bien une 8e question dans l’ordre courant.
- **`120.30s`** n’est **pas** un temps global de l’entretien : c’est un temps **dans la réponse vidéo de cette question**.
- Pour la citation visible (`Je dirais que j'ai plutôt un management participatif...`), la réponse source dure environ **180,2 s** et la citation tombe vers les **2/3** du texte, donc le calcul actuel donne logiquement **120,3 s**.

Autrement dit : **le calcul semble suivre la règle demandée**, mais **l’affichage donne l’impression d’un bug** parce qu’on ne comprend pas assez clairement ce que représente ce temps.

## Ce que je vais corriger
1. **Rendre le repère lisible**
   - remplacer l’affichage brut `120.30s` par un format clair type **`2:00`**
   - garder le préfixe question, mais sans ambiguïté visuelle

2. **Clarifier que le temps est relatif à la réponse**
   - ajuster le libellé/infobulle pour indiquer que le repère correspond au **moment dans la réponse à la question**, pas au chrono global de l’entretien

3. **Vérifier le saut vidéo**
   - contrôler que le clic lance bien le bon clip et se place au bon endroit pour ce cas précis d’Aline
   - si besoin, réduire l’écart introduit par la marge de lecture avant le moment

4. **Sécuriser le numéro de question**
   - vérifier le mapping quand plusieurs questions ont un `order_index` identique, pour éviter les numéros surprenants

## Détail technique
- Frontend ciblé : `src/components/session/EvidenceLink.tsx`, `src/pages/SessionDetail.tsx`, éventuellement `src/components/session/SessionVideoNavigator.tsx`
- Vérification logique : repère calculé à partir de `resolve-start-seconds.ts`
- Pas de changement backend prévu tant que le calcul lui-même reste cohérent avec la méthode mot → pourcentage → durée

## Résultat attendu
Le recruteur doit lire immédiatement quelque chose comme **`Q8 2:00`** et comprendre que c’est **le moment dans la réponse à cette question**, avec un clic qui arrive visiblement au bon passage.