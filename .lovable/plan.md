# Entretiens interrompus : ne plus les faire passer pour des entretiens terminés

## Le fait constaté (vérifié en base)

Les deux sessions de Marion Botte (24 août, 10h20 et 10h25) sont marquées « terminée » alors qu'elle a seulement répondu à la question 1 sur 6 puis quitté. Aucune réponse candidat n'est enregistrée en base, mais la vidéo de la question 1 existe bien dans le stockage. Résultat : deux entretiens qui polluent la liste des candidats et deux jobs de rapport qui ont échoué 6 fois de suite (`no_recordings`).

Ce n'est pas lié au chantier micro d'hier : la télémétrie a été créée six heures après ces sessions et n'a jamais collecté la moindre donnée.

La vraie anomalie n'est donc pas « le rapport n'a pas été généré », c'est **« une session abandonnée est affichée comme terminée »**. C'est ce qu'on corrige — sans jamais produire de rapport sur un entretien non abouti.

## Le principe retenu

Un entretien ne peut être déclaré terminé que si le candidat est allé au bout du parcours. Sinon, il est marqué comme abandonné : il sort de la liste des candidats à analyser, aucun rapport n'est demandé, aucun job ne part en file — mais il reste visible et traçable côté recruteur et côté Super Admin, avec l'avancement réel (« a répondu à 1 question sur 6 »).

Aucun rapport partiel ne sera produit, ni maintenant ni par rattrapage.

## Pourquoi ne pas créer un nouveau statut

Ajouter une valeur « abandonné » au statut obligerait à toucher tous les filtres, badges, statistiques et exports : c'est le genre de changement qui casse silencieusement un écran oublié. On réutilise donc le statut « annulé », déjà géré partout, complété par deux informations nouvelles qui ne servent qu'à qualifier le cas : la date d'abandon et le nombre de questions réellement traitées. Les écrans existants continuent de fonctionner sans modification ; seuls les endroits où l'on veut afficher « Abandonné — 1/6 » lisent ces nouvelles colonnes.

## Ce qui change concrètement

### 1. La règle de finalisation
La récupération automatique d'une session interrompue continue de réassembler les médias (on ne perd rien), mais elle ne déclare plus « terminée » une session dont le candidat n'a pas atteint la dernière question. Dans ce cas : statut annulé, date d'abandon, avancement enregistré. Un entretien réellement mené jusqu'au bout mais dont l'onglet s'est fermé au dernier moment reste, lui, finalisé normalement — c'est le seul cas où la récupération produit un rapport.

### 2. Plus de jobs de rapport fantômes
Aucun job n'est mis en file pour une session abandonnée, et les jobs déjà en échec pour ce motif sont annulés au lieu de retenter six fois. La file de génération arrête de tourner à vide.

### 3. Ce que voit le recruteur
Dans la liste des candidats, ces entretiens apparaissent avec une mention « Abandonné » et l'avancement (« 1/6 questions »), au lieu d'un faux « Terminé » sans rapport. Ils ne comptent pas dans les entretiens à analyser.

### 4. Ce que voit le Super Admin
Dans le suivi des anomalies existant, on sépare deux familles :
- **Abandon candidat** : le candidat a quitté volontairement, rien à réparer — action possible : relancer avec un nouveau lien (flux de réinvitation déjà en place).
- **Incident technique** : la session s'arrête après une coupure média (piste morte, trou d'enregistrement) — c'est là qu'un correctif produit est attendu.

La distinction se fait sur les signaux déjà disponibles : présence d'une interruption d'enregistrement et instant de la sortie. Sur la première session de Marion, il y a justement un trou de 90 secondes entre deux fragments — signe d'un onglet passé en arrière-plan ou d'une piste coupée. Ce cas-là sera classé « à surveiller », pas « abandon propre ».

### 5. Régularisation des cas déjà en base
Les sessions déjà marquées « terminées » sans aucune réponse rattachée sont repassées en abandonnées, avec leur avancement réel, et leurs jobs de rapport en échec sont annulés. Les deux sessions de Marion en font partie. Aucun rapport n'est généré pour elles.

### 6. Fiabiliser le comptage de l'avancement
Aujourd'hui la réponse candidat n'est écrite en base qu'à la fin de la question, ce qui rend l'avancement invisible en cas de sortie brutale. On crée la ligne de réponse dès le début de chaque question, complétée ensuite. Cela ne change rien à l'expérience candidat, mais permet de savoir exactement où il s'est arrêté — et c'est cette information qui rend la règle du point 1 fiable.

## Détails techniques

- Migration : ajout de `sessions.abandoned_at` et `sessions.answered_questions_count` (deux colonnes optionnelles, sans valeur par défaut contraignante). Aucun changement d'énumération, donc aucun risque de casse sur les filtres existants.
- `supabase/functions/finalize-abandoned-session/index.ts` : conditionner le passage à `completed` à « dernière question atteinte ET au moins un média rattaché » ; sinon `cancelled` + `abandoned_at` + avancement. `linkMediaToMessage` insère la ligne candidat manquante uniquement pour conserver la trace du média, sans déclencher de rapport.
- `supabase/functions/cleanup-abandoned-sessions/index.ts` et `backfill-orphan-reports` : ne plus enquêter/enfiler les sessions sans média rattaché — les basculer en abandonnées et annuler le job via `admin_cancel_report_job`.
- `src/pages/InterviewStart.tsx` : création anticipée de la ligne `session_messages` candidat (statut de transcription en attente) à l'ouverture de chaque question.
- UI : `SessionStatusBadge` affiche « Abandonné — n/N » quand `abandoned_at` est renseigné ; `AdminCandidatesToRecover` sépare abandon volontaire et incident technique.
- Régularisation : script SQL ponctuel sur les sessions terminées sans média rattaché.

## Vérification avant publication

- Contrôle de typage et tests existants.
- Test bout en bout : abandon après la question 1 → statut abandonné, aucun job créé, aucun rapport ; entretien complet → rapport généré comme aujourd'hui.
- Contrôle en base après régularisation : plus aucune session « terminée » sans réponse rattachée, plus aucun job en échec `no_recordings`.

## Un point à trancher

La règle proposée est stricte : rapport uniquement si toutes les questions ont été traitées. Si tu préfères un seuil (par exemple rapport possible à partir de 80 % des questions répondues), dis-le et j'ajuste — le reste du plan ne change pas.
