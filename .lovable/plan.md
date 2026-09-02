# Remplacer la clé API ElevenLabs et valider le clonage de voix

## Objectif
Remplacer `ELEVENLABS_API_KEY` par la nouvelle clé fournie, puis vérifier que le TTS et le clonage de voix fonctionnent sans erreur dans les edge functions.

## Impact sur les voix déjà clonées

- Les `voice_id` stockés dans les profils (`profiles.cloned_voice_id`) ne seront **pas effacés** par le simple fait de changer la clé.
- En revanche, ElevenLabs ne fournit pas d'API de "transfert" de voix d'un compte à un autre. Donc :
  - **Si la nouvelle clé appartient au même compte ElevenLabs** : les voix clonées existantes restent utilisables. Le TTS continuera à fonctionner avec les anciens `voice_id`.
  - **Si la nouvelle clé appartient à un autre compte ElevenLabs** : les anciens `voice_id` ne seront plus accessibles avec la nouvelle clé (erreur 404 / voice not found). Les utilisateurs devront re-cloner leur voix.
- L'action `delete-cloned-voice` essaie de supprimer la voix chez ElevenLabs **avant** d'effacer le `voice_id` en base. Si la nouvelle clé n'a pas accès à l'ancien `voice_id`, la suppression chez ElevenLabs échouera silencieusement (`catch`) mais le profil sera quand même nettoyé.
- Plan de sécurité : avant de remplacer la clé, on identifiera les profils ayant une `cloned_voice_id` et on avertira / proposera de les re-cloner si le compte change.

## Étapes

1. **Sauvegarder la liste des voix clonées existantes**
   - Requête SQL sur `profiles` pour lister `user_id`, `cloned_voice_id`, `cloned_voice_name` et `cloned_voice_created_at`.
   - Afficher le nombre de voix concernées.

2. **Remplacer le secret**
   - Mettre à jour `ELEVENLABS_API_KEY` avec la nouvelle clé (`sk_e4fd...98fac`) via l'outil de gestion des secrets du backend.

3. **Vérifier la propagation**
   - Confirmer que le secret est bien injecté dans l'environnement des edge functions.

4. **Tester le TTS** (fonction `tts-elevenlabs`)
   - Appel en mode `preview` avec un texte court et une voix par défaut.
   - Vérifier que la réponse est bien un flux `audio/mpeg` (et pas un JSON d'erreur type `api_error` / `no_api_key`).
   - Tester aussi avec un `voice_id` provenant d'une voix clonée existante (même compte) pour confirmer qu'elle est toujours lisible.

5. **Tester le clonage de voix** (fonction `clone-voice`)
   - Vérifier d'abord que la fonction répond correctement (auth requise, clé présente — plus d'erreur "Clé ElevenLabs manquante").
   - Si un fichier audio de test est disponible : envoyer un court échantillon (~10-20 s de voix) via le formulaire de clonage et confirmer que ElevenLabs renvoie un `voice_id` et que le profil est mis à jour.
   - Sinon : confirmer via un appel direct à l'API ElevenLabs (`/v1/voices`) que la clé a accès aux fonctionnalités de clonage (dépend du plan ElevenLabs du compte — Starter minimum requis pour le clonage instantané).

6. **Re-déploiement si besoin**
   - Re-déployer `tts-elevenlabs` et `clone-voice` uniquement si le secret n'est pas pris en compte à chaud.

7. **Informer l'utilisateur de l'impact**
   - Si les voix existantes sont sur le même compte : aucune action utilisateur requise.
   - Si les voix existantes sont sur un compte différent : proposer un script de nettoyage / re-clonage pour les utilisateurs concernés.

## Points de vigilance
- La clé fournie est un secret : elle sera stockée côté backend uniquement, jamais dans le code ou `.env` frontend.
- Le clonage instantané ElevenLabs exige un plan payant (Starter+) : si la clé vient d'un compte gratuit, l'API renverra une erreur explicite qui sera remontée.
- Aucun changement de code n'est nécessaire a priori — seuls le secret et les tests.
