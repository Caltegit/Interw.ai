Ajouter l'alignement de texte dans `RichTextEditor.tsx` :

1. Installer `@tiptap/extension-text-align`.
2. L'ajouter aux extensions Tiptap, configuré pour `heading` et `paragraph`, alignements `left|center|right`.
3. Ajouter 3 boutons dans la toolbar (icônes `AlignLeft`, `AlignCenter`, `AlignRight` de lucide), avec état actif via `editor.isActive({ textAlign: 'xxx' })` et action `setTextAlign('xxx')`.
4. Vérifier que `prose` rend bien `text-align` (sinon ajouter une classe utilitaire — Tiptap applique `style="text-align"` inline donc OK).