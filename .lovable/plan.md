

## Avatar IA en 2/3 de l'écran — ajustement layout

### Changement

Sur desktop, l'avatar IA occupe 2/3 de la largeur centrale, la zone question/CTA occupe 1/3.

### Schéma desktop (≥ 1024px)

```text
┌──────────────────────────────────────────────────────┐
│  Question 2/5  ████████░░░░  · 💾 Sauvegarde…       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────┐  ┌───────────────┐  │
│  │                            │  │ QUESTION      │  │
│  │                            │  │ "Parlez-moi   │  │
│  │       AVATAR IA            │  │  de votre     │  │
│  │       (très grand,         │  │  expérience…" │  │
│  │        halo si parle)      │  │               │  │
│  │                            │  │ ───────────   │  │
│  │       ~2/3 largeur         │  │ 🎙️ À vous !  │  │
│  │       hauteur max          │  │               │  │
│  │       disponible           │  │ [✓ Réponse    │  │
│  │                            │  │   finie]      │  │
│  └────────────────────────────┘  └───────────────┘  │
│         2/3                            1/3           │
├──────────────────────────────────────────────────────┤
│              [Arrêter l'entretien]                   │
└──────────────────────────────────────────────────────┘
PIP candidat 140×100 fixed bottom-4 left-4
```

### Mobile (< 768px)

Inchangé : empilement vertical, avatar ~180px, zone texte dessous. Le ratio 2/3-1/3 ne s'applique qu'en desktop.

### Détails techniques

- `src/pages/InterviewStart.tsx` : grid centrale passe de `lg:grid-cols-[auto_1fr]` à `lg:grid-cols-3` avec avatar en `lg:col-span-2` et zone droite en `lg:col-span-1`.
- Avatar : conteneur carré responsive, `aspect-square w-full max-h-[70vh] mx-auto`, cercle avec halo `ring-4 ring-primary/40 animate-pulse` quand `isSpeaking`.
- Zone droite : `flex flex-col justify-center gap-6`, alignée verticalement avec le centre de l'avatar.
- Header sticky + footer ghost inchangés.
- PIP candidat inchangée.

### Hors scope

- Pas de changement logique vidéo/audio/IA
- Pas de modif du flow questions
- Mobile reste en empilement vertical

