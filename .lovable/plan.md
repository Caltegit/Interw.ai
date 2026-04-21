

## Plan — Page d'accueil Bibliothèque

Créer une page d'accueil sur `/library` qui présente les 5 types de bibliothèques avec une carte par type, leur utilité et un compteur d'éléments existants.

### Comportement

- Nouvelle route `/library` → `src/pages/LibraryHome.tsx`.
- Le clic sur « Bibliothèque » dans la barre latérale ouvre le sous-menu **et** navigue vers cette page d'accueil.
- En haut : titre + courte phrase d'introduction.
- 5 cartes cliquables (grille 1/2/3 colonnes selon la taille d'écran), une par bibliothèque :

| Carte | Icône | Description courte | Compteur |
|---|---|---|---|
| Entretiens types | ClipboardList | Modèles d'entretiens prêts à dupliquer pour lancer un projet en quelques secondes. | nombre d'`interview_templates` |
| Questions | MessageSquare | Vos questions réutilisables (texte, audio, vidéo) avec niveau de relance et indications. | `question_templates` |
| Critères d'évaluation | ListChecks | Critères pondérés réutilisables avec ancrages de notation pour homogénéiser vos rapports. | `criteria_templates` |
| Intros | Mic | Messages d'accueil audio ou vidéo joués au candidat avant l'entretien. | `intro_templates` |
| Emails | Mail | Modèles d'emails personnalisés (invitation, rappel, résultat). | `email_templates` |

Chaque carte : icône colorée à gauche, titre, description sur 2 lignes max, badge avec le nombre d'éléments, flèche `→` au survol. Hover : léger scale + bordure primary.

### Détails techniques

**Fichiers créés**
- `src/pages/LibraryHome.tsx` : composant page. Récupère l'`organization_id` via `get_user_organization_id`, puis 5 requêtes `select count` en parallèle (`Promise.all`) pour afficher les compteurs. Skeleton pendant le chargement.

**Fichiers modifiés**
- `src/App.tsx` : ajouter `<Route path="/library" element={<LibraryHome />} />`.
- `src/components/AppSidebar.tsx` : transformer le `CollapsibleTrigger` en double comportement — clic = navigation vers `/library` ET ouverture du sous-menu. Solution simple : envelopper l'icône+label dans un `NavLink` vers `/library`, et garder un petit chevron à droite qui gère uniquement le toggle du sous-menu (`onClick` avec `e.stopPropagation` + `e.preventDefault`).

### Hors champ

- Pas de modification des 5 pages existantes.
- Pas de nouveau type de bibliothèque.
- Pas de recherche transverse entre bibliothèques (à envisager plus tard).

