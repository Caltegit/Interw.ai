# Sidebar simplifiée + bouton compte en bas

## Réponses avant de coder

### La voix clonée est rattachée à l'utilisateur

Table `profiles`, colonnes `cloned_voice_id`, `cloned_voice_name`, `cloned_voice_created_at`, `cloned_voice_consent_at`. Clé étrangère : `profiles.user_id → auth.users.id`. La lecture dans la page filtre bien sur `.eq("user_id", user.id)`.

C'est donc bien du niveau **utilisateur** : la carte « Ma voix clonée » part dans `/settings/profil`, conformément à ta répartition.

### État partagé entre les cartes qui se séparent

Vérifié : aucune duplication nécessaire. La répartition est nette.

| État / hook | Cartes concernées | Destination |
|---|---|---|
| `fullName`, `useUpdateProfile` | Mon profil | profil |
| `newPassword`, `confirmPassword`, `savingPassword` | Mot de passe | profil |
| `clonedVoice`, `voiceLoading`, `cloneDialogOpen`, `confirmDeleteVoice`, `deletingVoice`, `previewingVoice` | Ma voix clonée | profil |
| `org`, `orgName`, `orgSlug`, `initialSlug`, `orgLogo`, `orgInitialized`, `useUpdateOrganization` | Organisation | organisation |
| `useOrgRole` (`isAdmin`, `orgId`, `roleLoading`) | Organisation + Membres | organisation uniquement |
| `useAuth`, `useToast` | les deux | ce sont des hooks globaux, pas de la duplication |

`useOrgRole` n'est utilisé que par les cartes Organisation et Membres : il ne part pas côté profil.

### Routes câblées

| Entrée | Route |
|---|---|
| Mon profil | `/settings/profil` |
| Mon organisation | `/settings/organisation` |
| Super admin | `/admin` |
| Système | `/admin/system` (onglets `?tab=emails` / `?tab=sessions`) |

Redirections permanentes ajoutées :
- `/settings` → `/settings/profil`
- `/admin/emails` → `/admin/system?tab=emails`
- `/admin/sessions-queue` → `/admin/system?tab=sessions`

## 1. Sidebar principale

Ne restent que 5 entrées : **Dashboard**, **Projets**, **Ressources** (sous-items inchangés), **Feedback**, **Tuto** (super admin uniquement, comme aujourd'hui).

Retirés de la nav : Paramètres, Super Admin, et le groupe repliable Système (avec son état `systemOpen` devenu inutile). Aucune page, route ni composant supprimé de ce fait — seules les entrées de menu disparaissent.

La logique de highlight actuelle (`NavLink` + `activeClassName`) et le badge de feedback non lu sont conservés à l'identique pour les entrées restantes.

## 2. Bouton compte dans le SidebarFooter

Remplace le texte de l'email + le bouton Déconnexion par un unique bouton pleine largeur :

```text
┌──────────────────────────────┐
│ (EB)  Eva Bouillet-Danel   ▸ │
│       eva@alboteam.com       │
└──────────────────────────────┘
```

Avatar shadcn avec initiales dérivées de `profile.full_name` (pas de champ photo dans `profiles` aujourd'hui, donc initiales systématiques). En mode sidebar réduite, seul l'avatar reste visible.

Dropdown (`DropdownMenu` shadcn, `side="right"` / `align="end"`, `side="top"` sur mobile), dans cet ordre :

```text
En-tête non cliquable : avatar + nom + email
──────────────────────
Mon profil          → /settings/profil
Mon organisation    → /settings/organisation
──────────────────────  (super admin uniquement)
Super admin         → /admin
Système             → /admin/system
──────────────────────
Déconnexion         → signOut()
```

Le check de rôle réutilise le hook `useSuperAdmin()` déjà appelé dans `AppSidebar` — aucun nouveau check, aucune duplication.

Sur mobile, le footer reste dans le drawer et le dropdown s'ouvre au-dessus du bouton.

## 3. Scission de la page Paramètres

Les cartes sont **déplacées telles quelles** : même JSX, mêmes hooks, mêmes appels, mêmes textes, mêmes validations. Les permissions de la carte Membres (`isAdmin` issu de `useOrgRole`) sont inchangées.

- `src/pages/settings/SettingsProfile.tsx` — cartes Mon profil, Mot de passe, Ma voix clonée (+ `VoiceCloneDialog` et l'`AlertDialog` de suppression)
- `src/pages/settings/SettingsOrganization.tsx` — cartes Organisation (dont `OrgLogoUpload`) et `OrgMembers`
- `src/pages/Settings.tsx` supprimé, remplacé par une redirection dans le routeur

Aucun changement de logique métier, de schéma, de table ni de colonne.

## 4. Page Système unifiée

Nouvelle page `src/pages/AdminSystem.tsx`, protégée par `SuperAdminRoute` comme les pages actuelles :

- Onglets shadcn `Tabs`, même pattern que la console Super Admin
- Onglet actif lu et écrit dans l'URL via `useSearchParams` : recharger `/admin/system?tab=sessions` rouvre bien Sessions ; sans paramètre, `emails` par défaut
- Le contenu des deux pages actuelles (`AdminEmails.tsx`, `AdminSessionsQueue.tsx`) est déplacé dans deux composants d'onglet, sans réécriture

Les fichiers `src/pages/AdminEmails.tsx` et `src/pages/AdminSessionsQueue.tsx` sont supprimés une fois les redirections en place — aucun composant orphelin.

## 5. Détails techniques

- Fichiers modifiés : `src/components/AppSidebar.tsx`, `src/App.tsx`
- Fichiers créés : `src/pages/settings/SettingsProfile.tsx`, `src/pages/settings/SettingsOrganization.tsx`, `src/pages/AdminSystem.tsx`, plus les deux composants d'onglet système
- Fichiers supprimés : `src/pages/Settings.tsx`, `src/pages/AdminEmails.tsx`, `src/pages/AdminSessionsQueue.tsx`
- Aucune nouvelle dépendance : `DropdownMenu`, `Avatar`, `Tabs`, `SidebarFooter` existent déjà dans le projet
- Les liens internes vers `/settings`, `/admin/emails` et `/admin/sessions-queue` présents ailleurs dans le code (rapport de santé quotidien, liens d'emails) continuent de fonctionner grâce aux redirections
