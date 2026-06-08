## Objectif
Sur la barre d'onglets du rapport de session, pour les 4 onglets avec note (Fit Poste, Orale, Attitude, Big Five) : retirer le picto, placer la pastille de note **au-dessus** du libellé et l'agrandir x1,5. Garder Résumé et Texte tels quels (picto + libellé).

## Changements (un seul fichier)

**`src/components/session/SessionReportView.tsx`** — bloc `tabsList` (lignes 275-310 environ)

1. **Fit Poste / Orale / Attitude / Big Five** : supprimer l'icône Lucide (`Target`, `Mic`, `User`, `Brain`). Conserver le `flex flex-col items-center justify-center` du `TabsTrigger`, mais ne garder que :
   - `<XxxBadge ... size={48} />` en premier (au-dessus)
   - `<span>` libellé en second (en-dessous)
   Imports devenus inutiles (`Target`, `Mic`, `User`, `Brain`) à retirer du `import { … } from "lucide-react"`.

2. **Taille pastille** : passer `size={32}` → `size={48}` pour `FitScoreBadge`, `ParaverbalBadge`, `NonverbalBadge`, `BigFiveBadge`.

3. **Résumé / Texte** : inchangés (icône + libellé empilés comme aujourd'hui).

4. **Hauteur de la barre** : conserver `h-20` actuel ; il accueille déjà confortablement une pastille de 48px + libellé.

5. Aucun autre fichier touché. Pas de logique métier modifiée.

## Vérification
Recharger `/sessions/...`, capturer la barre d'onglets et confirmer :
- Pictos absents sur les 4 onglets concernés.
- Pastille de note plus grosse, placée au-dessus du libellé.
- Onglets Résumé / Texte intacts.
- Onglet actif toujours bien différencié.
