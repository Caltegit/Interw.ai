# Partager le rapport : nouveau wording + popup avec lien et avertissements

## 1. Action dans le menu déroulant
Fichier : `src/components/session/DecisionBanner.tsx`

- Renommer l'entrée du menu en **« Partager ce rapport »** (qu'il y ait déjà un lien ou non — un seul libellé)
- Picto : `Share2` (déjà importé)
- Au clic : ouvre une boîte de dialogue (au lieu de copier directement). Supprimer les props `onCopyShare`, `copied`, `isShareLoading` qui ne servent plus côté menu.

## 2. Nouvelle boîte de dialogue de partage
Nouveau composant `src/components/session/ShareReportDialog.tsx` utilisant `Dialog` (shadcn).

Contenu :
- Titre : « Partager ce rapport »
- Champ input en lecture seule contenant le lien + bouton **Copier** (icône `Copy` → `Check` 2 s après copie)
- Si aucun lien n'existe encore : bouton **« Générer le lien »** qui appelle `createShare` puis affiche le champ
- Date d'expiration affichée : « Lien valable jusqu'au JJ/MM/AAAA (10 jours) »
- Bloc d'avertissement (style `bg-warning/10 border-warning/30`, icône `AlertTriangle`) :
  > Ce lien expire automatiquement après 10 jours.
  > Conformité RGPD : ne rendez jamais cette session publique. Ne partagez ce lien qu'avec les personnes strictement nécessaires à la décision de recrutement (équipe RH, manager). Le candidat n'a pas consenti à une diffusion plus large.

Pilotage de l'ouverture : state local `shareOpen` dans `SessionDetail.tsx`, passé au `DecisionBanner` via une nouvelle prop `onShare` qui ouvre simplement le dialog. Le dialog reçoit `shareUrl`, `onGenerate`, `isGenerating`, `expiresAt`.

## 3. Expiration 10 jours (back)
Fichier : `src/hooks/queries/useSessionDetail.ts`

- Dans `useCreateReportShare`, ajouter à l'insert :
  ```ts
  expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
  ```
- Dans `fetchSessionDetail`, ajouter `expires_at` à la liste sélectionnée et filtrer côté client `gt('expires_at', now)` (la RLS le fait déjà mais on a besoin de la date pour l'affichage)
- Étendre `SessionDetailData.shareUrl` → ajouter `shareExpiresAt: string | null`

Aucune migration DB nécessaire : la colonne `expires_at` existe déjà et la RLS filtre déjà les liens expirés (`expires_at IS NULL OR expires_at > now()`).

## 4. Liens existants sans expiration
Les liens créés avant ce changement ont `expires_at = NULL` → restent valides indéfiniment (comportement actuel). On ne touche pas aux liens existants pour ne pas casser ceux déjà partagés. Tu veux qu'on leur applique aussi une expiration rétroactive (par exemple 10 jours à partir d'aujourd'hui) ? Dis-le-moi si oui.

## Détails techniques
- Fichiers modifiés : `DecisionBanner.tsx`, `SessionDetail.tsx`, `useSessionDetail.ts`
- Fichier créé : `components/session/ShareReportDialog.tsx`
- Aucune migration SQL
- Composants shadcn utilisés : `Dialog`, `Input`, `Button`, `Alert` (ou bloc custom avec `AlertTriangle`)
