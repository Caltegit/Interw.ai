# Suppression du bouton "Retour"

Le bouton "Retour" en haut à gauche de chaque page RH ne fait que `navigate(-1)` — strictement équivalent au bouton précédent du navigateur. Il n'apporte aucune valeur ajoutée et encombre l'interface (surtout sur mobile, où il se superpose visuellement au nouveau bouton menu).

## Changement

**Fichier : `src/components/AppLayout.tsx`**

- Supprimer le composant `BackButton` (déclaration + utilisation dans `<main>`).
- Supprimer les imports devenus inutiles : `useNavigate` (react-router-dom), `Button` (ui/button), `ArrowLeft` (lucide-react).
- Supprimer le wrapper `<div className="-mt-[3px]">` autour de `<Outlet />` qui ne servait qu'à compenser la marge du bouton.

## Hors périmètre

- Aucun changement de logique métier.
- Aucun changement sur le layout candidat (`CandidateLayout.tsx`) ni sur le bouton menu mobile ajouté précédemment.

## Vérification

- Preview desktop et mobile (393px) : plus de bouton "Retour", contenu des pages remonte proprement sous le header, bouton menu mobile toujours visible et fonctionnel.
