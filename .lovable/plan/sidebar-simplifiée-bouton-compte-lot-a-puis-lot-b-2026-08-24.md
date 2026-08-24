# Sidebar simplifiée + bouton compte — Lot A puis Lot B

## Routes câblées

| Entrée du dropdown | Lot A | Lot B |
|---|---|---|
| Mon profil | `/settings/profil` | inchangé |
| Mon organisation | `/settings/organisation` | inchangé |
| Super admin | `/admin` | inchangé |
| Système | `/admin/emails` (URL actuelle) | repointé vers `/admin/system` |

---

# Lot A

## 1. Sidebar principale

Ne restent que 5 entrées : **Dashboard**, **Projets**, **Ressources** (sous-items inchangés), **Feedback**, **Tuto** (super admin uniquement, comme aujourd'hui).

Retirés de la navigation : Paramètres, Super Admin, et le groupe repliable Système (avec son état `systemOpen` devenu inutile). Aucune page, route ni composant n'est supprimé pour autant : `/admin`, `/admin/emails`, `/admin/sessions-queue` restent accessibles en direct.

Le highlight actif (`NavLink` + `activeClassName`) et le badge de feedback non lu sont conservés à l'identique.

## 2. Bouton compte dans le SidebarFooter

Le texte de l'email et le bouton Déconnexion sont remplacés par un unique bouton pleine largeur :

```text
┌──────────────────────────────┐
│ (EB)  Eva Bouillet-Danel   ▸ │
│       eva@alboteam.com       │
└──────────────────────────────┘
```

Avatar shadcn avec initiales issues de `profile.full_name` (pas de champ photo dans `profiles`, donc initiales systématiques). Sidebar réduite : seul l'avatar reste visible.

Dropdown (`DropdownMenu` shadcn, `side="right"` `align="end"` en desktop, `side="top"` en mobile) :

```text
En-tête non cliquable : avatar + nom + email
──────────────────────
Mon profil          → /settings/profil
Mon organisation    → /settings/organisation
──────────────────────  (super admin uniquement)
Super admin         → /admin
Système             → /admin/emails
──────────────────────
Déconnexion         → signOut()
```

Le check de rôle réutilise `useSuperAdmin()`, déjà appelé dans `AppSidebar`. Aucun nouveau check.

## 3. Scission de la page Paramètres

Les cartes sont déplacées telles quelles : même JSX, mêmes hooks, mêmes textes, mêmes validations, mêmes permissions.

- `src/pages/settings/SettingsProfile.tsx` — Mon profil, Mot de passe, Ma voix clonée (`VoiceCloneDialog` + `AlertDialog` de suppression). État : `fullName`, `useUpdateProfile`, `newPassword`/`confirmPassword`/`savingPassword`, `clonedVoice` & co.
- `src/pages/settings/SettingsOrganization.tsx` — Organisation (dont `OrgLogoUpload`) et `OrgMembers`. État : `org`, `orgName`, `orgSlug`, `initialSlug`, `orgLogo`, `orgInitialized`, `useUpdateOrganization`, `useOrgRole`.

`useOrgRole` n'est utilisé que par les cartes Organisation et Membres : rien à dupliquer côté profil. `src/pages/Settings.tsx` est supprimé, `/settings` devient une redirection vers `/settings/profil`.

Aucune modification de logique métier, de schéma ni de colonne.

## 4. Ce que tu dois cliquer pour vérifier (fin du Lot A)

**Sidebar, connectée en super admin :**
1. La nav ne montre que Dashboard, Projets, Ressources, Feedback, Tuto. Plus de Paramètres, plus de Super Admin, plus de Système.
2. Ressources se déplie toujours avec ses 5 sous-items (Sessions, Questions, Critères, Intros, Emails).
3. Le badge rouge de feedback non lu est toujours là sur Feedback.
4. Replie la sidebar (bouton en haut) : les icônes restent, le bouton compte se réduit à l'avatar seul, le dropdown reste ouvrable.

**Bouton compte, en super admin :**
5. En bas : avatar + ton nom + ton email + chevron. Clic → dropdown avec, dans l'ordre : en-tête, Mon profil, Mon organisation, séparateur, Super admin, Système, séparateur, Déconnexion.
6. Mon profil → `/settings/profil` : cartes Mon profil, Mot de passe, Ma voix clonée. Enregistre un changement de nom pour confirmer que ça marche encore.
7. Mon organisation → `/settings/organisation` : carte Organisation (nom, slug, logo) + liste des membres avec les boutons d'admin.
8. Super admin → `/admin`, Système → `/admin/emails` : les deux pages s'ouvrent normalement, inchangées.
9. Déconnexion fonctionne.

**Compte non super admin (ex. un membre d'une organisation cliente) :**
10. La nav n'affiche pas Tuto, et Ressources n'affiche pas le sous-item Emails (comportement actuel conservé).
11. Le dropdown s'arrête à : en-tête, Mon profil, Mon organisation, Déconnexion. Ni Super admin ni Système.
12. Sur `/settings/organisation`, s'il n'est pas admin de son organisation, les actions d'administration restent masquées comme aujourd'hui.

**URLs directes (les liens en dur et les liens d'emails ne doivent pas casser) :**
13. `/settings` redirige vers `/settings/profil`.
14. `/admin/emails`, `/admin/sessions-queue`, `/admin/report-jobs`, `/admin/candidates-to-recover`, `/admin/tuto`, `/admin/tts-compare` s'ouvrent toujours.
15. En non super admin, ouvrir `/admin` renvoie bien au dashboard.

**Mobile :**
16. Ouvre le menu : le bouton compte est en bas du tiroir, le dropdown s'ouvre au-dessus et reste cliquable.

---

# Lot B (après ta validation du Lot A)

## Passage 1 — création, sans aucune suppression

- Nouvelle page `src/pages/AdminSystem.tsx`, protégée par `SuperAdminRoute`, onglets shadcn `Tabs` sur le même pattern que la console Super Admin.
- Onglet actif lu et écrit dans l'URL via `useSearchParams` : `/admin/system?tab=sessions` rouvre Sessions ; sans paramètre, `emails` par défaut.
- Le contenu de `AdminEmails.tsx` et `AdminSessionsQueue.tsx` est extrait dans deux composants d'onglet, sans réécriture.
- Route `/admin/system` ajoutée. Redirections `/admin/emails` → `/admin/system?tab=emails` et `/admin/sessions-queue` → `/admin/system?tab=sessions`.
- L'entrée Système du dropdown pointe désormais vers `/admin/system`.
- Les anciens fichiers restent en place à ce stade.

Tu testes.

## Passage 2 — suppression, après ton feu vert

Suppression de `src/pages/AdminEmails.tsx` et `src/pages/AdminSessionsQueue.tsx` une fois les onglets validés.

## Détails techniques

- Lot A modifie : `src/components/AppSidebar.tsx`, `src/App.tsx`. Crée : `src/pages/settings/SettingsProfile.tsx`, `src/pages/settings/SettingsOrganization.tsx`. Supprime : `src/pages/Settings.tsx`.
- Aucune nouvelle dépendance : `DropdownMenu`, `Avatar`, `Tabs`, `SidebarFooter` existent déjà.
