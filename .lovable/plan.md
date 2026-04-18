

## Remplacer "InterviewAI" par "Interw.ai" partout

La capture montre la page Login qui affiche encore "InterviewAI". Je vais chercher toutes les occurrences restantes.
<lov-tool-use id="toolu_vrtx_016wmWPJmeRJVNhfYEkem8Y4" name="code--search_files" integration-id="code" data="{\"query\": \"InterviewAI\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0196DC4spkgyxa8NDD7W8P5F" name="code--search_files" integration-id="code" data="{\"query\": \"InterviewAI\"}">
</lov-tool-use>
<lov-plan>

## Remplacer "InterviewAI" par "Interw.ai" partout

3 occurrences restantes trouvées :

1. **`src/pages/Login.tsx`** (ligne 54) → titre de la card de connexion (visible sur ta capture)
2. **`src/pages/InviteSignup.tsx`** (ligne 154) → titre de la page d'invitation
3. **`src/pages/SharedReport.tsx`** (ligne 212) → footer "Généré par InterviewAI"

### Action
Remplacer `InterviewAI` par `Interw.ai` dans ces 3 fichiers. C'est tout — aucune autre occurrence du nom dans le code.

