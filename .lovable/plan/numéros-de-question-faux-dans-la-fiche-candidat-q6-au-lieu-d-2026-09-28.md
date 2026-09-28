# Numéros de question faux dans la fiche candidat (Q6 au lieu de Q4)

## Ce qui se passe vraiment
Vous avez raison : le poste « Consultant SEO/GEO » a bien 8 questions, et Brice a répondu en vidéo aux 8. Screaming Frog est la **4e** question. Le lecteur (« Question 4 ») était juste ; c'est le bouton « Q6 · 0:00 » qui se trompait. Mon explication précédente était fausse.

Pourquoi « Q6 » : quand le poste a été modifié le 15 septembre, 9 anciennes questions (Présentation, Outils et CMS SEO, Rémunération…) ont été retirées. Elles restent enregistrées, masquées, pour conserver l'historique. Or la fiche candidat charge **toutes** les questions du poste, y compris ces 9 anciennes, soit 17. En les classant, Présentation et Outils et CMS SEO se glissent avant Screaming Frog, qui passe à la 6e place.

Ce défaut touche tous les postes dont des questions ont été retirées : numéros décalés sur les citations, la liste des réponses et le rapport.

## Correction
1. Dans la fiche candidat, numéroter les questions sans tenir compte de celles qui ont été retirées, **sauf** si le candidat y a répondu (anciens entretiens passés avant la modification) : celles-ci restent affichées, à leur place.
2. Afficher dans le lecteur le même numéro que sur les boutons de citation, pour que les deux ne puissent plus diverger.
3. Vérifier sur la fiche de Brice : « Q4 » partout pour Screaming Frog, et le clic ouvre la bonne vidéo.

## Impact
Seulement l'affichage des numéros de question dans les fiches candidats. Aucun changement des vidéos, notes, rapports, ni du parcours candidat. Après approbation : tests automatiques candidat puis recruteur (bloqués jusqu'ici par un problème de configuration, je le signalerai s'il persiste).

## Détails techniques
- `useSessionDetail.ts` : ajouter `archived_at` à la sélection `questions(...)`.
- `SessionReportView.tsx` (tri l.160/188, `questionLabel` l.175) : exclure les questions archivées sans message candidat, puis numéroter par rang.
- `SessionVideoNavigator.tsx` : utiliser `questionLabel` pour l'en-tête et la liste déroulante au lieu de l'indice de position.
