# Remplacer la clé API ElevenLabs et valider le clonage de voix

## Objectif
Remplacer `ELEVENLABS_API_KEY` par la nouvelle clé fournie, puis vérifier que le TTS et le clonage de voix fonctionnent sans erreur dans les edge functions.

## Étapes

1. **Remplacer le secret**
   - Mettre à jour `ELEVENLABS_API_KEY` avec la nouvelle clé (`sk_e4fd...98fac`) via l'outil de gestion des secrets du backend.

2. **Vérifier la propagation**
   - Confirmer que le secret est bien injecté dans l'environnement des edge functions.

3. **Tester le TTS** (fonction `tts-elevenlabs`)
   - Appel en mode `preview` avec un texte court et une voix par défaut.
   - Vérifier que la réponse est bien un flux `audio/mpeg` (et pas un JSON d'erreur type `api_error` / `no_api_key`).

4. **Tester le clonage de voix** (fonction `clone-voice`)
   - Vérifier d'abord que la fonction répond correctement (auth requise, clé présente — plus d'erreur "Clé ElevenLabs manquante").
   - Si un fichier audio de test est disponible : envoyer un court échantillon (~10-20 s de voix) via le formulaire de clonage et confirmer que ElevenLabs renvoie un `voice_id` et que le profil est mis à jour.
   - Sinon : confirmer via un appel direct à l'API ElevenLabs (`/v1/voices`) que la clé a accès aux fonctionnalités de clonage (dépend du plan ElevenLabs du compte — Starter minimum requis pour le clonage instantané).

5. **Re-déploiement si besoin**
   - Re-déployer `tts-elevenlabs` et `clone-voice` uniquement si le secret n'est pas pris en compte à chaud.

## Points de vigilance
- La clé fournie est un secret : elle sera stockée côté backend uniquement, jamais dans le code ou `.env` frontend.
- Le clonage instantané ElevenLabs exige un plan payant (Starter+) : si la clé vient d'un compte gratuit, l'API renverra une erreur explicite qui sera remontée.
- Aucun changement de code n'est nécessaire a priori — seuls le secret et les tests.
