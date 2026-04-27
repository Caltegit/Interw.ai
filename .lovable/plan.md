## Diagnostic
Sur la capture, le texte de secours **est bien rendu** (bloc en haut à droite « Après moi… ça va être à toi de m'imiter… ») mais quasi invisible : le bloc utilise `bg-card` + `text-foreground` qui, combinés au fond sombre du layout candidat et à un overlay translucide, donnent un texte très peu contrasté.

C'est donc un bug d'affichage / lisibilité, pas un texte manquant.

## Correctif

Dans `src/pages/InterviewStart.tsx` (lignes 2855-2862), le bloc « texte de secours » des questions vidéo :

1. Ajouter une **bordure accent à gauche** (comme les blocs énoncé `featured` du `QuestionMediaPlayer`) pour signaler visuellement que c'est l'énoncé de la question.
2. Forcer `text-foreground` pleine opacité et `whitespace-pre-wrap` pour conserver les retours à la ligne.
3. Ne plus afficher la carte vide quand `currentQ.content` est vide (évite un encadré inutile).
4. Légère opacité réduite sur le fond pour rester cohérent avec la maquette.

```tsx
{currentQ && questionType === "video" && currentQ.content?.trim() && !interviewFinished && (
  <div
    className="rounded-xl border-l-2 border bg-card/80 p-4"
    style={{ borderLeftColor: "hsl(var(--l-accent))" }}
  >
    <p className="text-sm sm:text-base font-medium leading-relaxed text-foreground whitespace-pre-wrap">
      {currentQ.content}
    </p>
  </div>
)}
```

## Hors-périmètre
- Pas de modification du formulaire (le champ « Ajouter un texte de secours » est déjà disponible pour les questions vidéo dans `QuestionFormDialog`).
- Pas de modification du `QuestionMediaPlayer` (le rendu vidéo featured n'affiche pas le texte, c'est `InterviewStart` qui s'en charge).

## Vérification
Recharger une session avec une question vidéo + texte de secours : le texte apparaît clairement sous la vidéo, en blanc plein contraste, avec une barre d'accent à gauche.
