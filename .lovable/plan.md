

## Plan — Mise en place de la CI GitHub Actions pour les tests E2E

Configurer l'exécution automatique des tests Playwright à chaque push, avec notifications par e-mail à chaque exécution et conservation des vidéos/captures uniquement en cas d'échec.

### Prérequis côté utilisateur (une seule fois)

1. **Connecter le projet à GitHub** : Connectors → GitHub → Connect project → Create Repository.
2. **Ajouter deux secrets dans GitHub** (Settings → Secrets and variables → Actions → New repository secret) :
   - `E2E_TEST_EMAIL` = `e2e-test@interw.ai`
   - `E2E_TEST_PASSWORD` = `E2eTest!2026`
3. **Activer les notifications e-mail à chaque exécution** sur GitHub : Profil