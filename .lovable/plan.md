

Le fix a déjà été implémenté au tour précédent (ref `currentPresentationRef` + replay TTS/média sur `resumeInterview`). L'utilisateur reformule peut-être parce que ça ne marche pas en test. Je vais vérifier le code actuel pour confirmer que tout est bien en place et identifier ce qui manquerait.
<lov-tool-use id="toolu_vrtx_01LBWBY75rnb1LuevaN45Yuj" name="code--search_files" integration-id="code" data="{\"query\": \"currentPresentationRef\", \"include_patterns\": \"src/pages/InterviewStart.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Y3UgxnN4cJ68q1PdeAGzP5" name="code--search_files" integration-id="code" data="{\"query\": \"currentPresentationRef|resumeInterview|pauseInterview\", \"include_patterns\": \"src/pages/InterviewStart.tsx\"}">
</lov-tool-use>
The pause/resume replay logic was already implemented in the previous turn. Let me check the user's message — they're reporting it again, which suggests it's not actually working. Let me inspect the resume code.
<lov-tool-use id="toolu_vrtx_018kiYor5SCceZ4WFvo2h1ow" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/InterviewStart.tsx\", \"lines\": \"383-470\"}">
</lov-tool-use>
The code is already implemented. The user is reporting again that it's not working. Let me check `speak()` to understand if there's an issue with replay — particularly the `currentPresentationRef` tracking and whether `pauseInterview` is properly cancelling.
<lov-tool-use id="toolu_vrtx_01EKqoBNt4CgYNS1mdKQWBHG" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/InterviewStart.tsx\", \"lines\": \"130-220\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_011dBF2aZBmtxvfCM7fxbaSb" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/InterviewStart.tsx\", \"lines\": \"220-345\"}">
</lov-tool-use>
I see the issue clearly now. There are **two separate code paths** for playing question media:

1. **`speak()`** (TTS) — properly tracks `currentPresentationRef` ✅
2. **`speakOrPlayQuestion()` → `playMediaUrl()`** (lines 250-265) — uses a transient `new Audio(url)` and **does NOT set `currentPresentationRef.current = { kind: "media" }`**, and there's no `featuredPlayerRef` involved either.

So when a question has audio_url/video_url and is played via `speakOrPlayQuestion`, pause/resume can't replay it because:
- The presentation ref is never marked as "media"
- The media element is a throwaway `new Audio()` not connected to `featuredPlayerRef`

Also, there's a **separate** path using `featuredPlayerRef` + `setShouldAutoPlay` + `markMediaPresentation` (lines 582-586) — meaning the codebase has TWO ways of playing question media and they're inconsistent.

Let me check where each is used.
<lov-tool-use id="toolu_vrtx_01C3zDmXiZxmFgjdCQD9CVsa" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/InterviewStart.tsx\", \"query\": \"speakOrPlayQuestion|markMediaPresentation|setShouldAutoPlay|featuredPlayerRef\"}">
</lov-tool-use>
Good — `speakOrPlayQuestion` looks like dead/legacy code. The actual flow uses `featuredPlayerRef` + `markMediaPresentation` + `setShouldAutoPlay`. So the implementation should work.

Let me check what `featuredPlayerRef.current?.restart()` does and one critical thing — whether `restart()` on a paused/stopped player actually works after `stop()` was called during pause.

Looking at `QuestionMediaPlayer`: `doStop()` resets `currentTime = 0` and `setHasFinished(false)`. `doRestart()` calls `setHasFinished(false); doPlay()`. That looks correct.

But wait — in the resume code at line 431, it does `setShouldAutoPlay(true)` *and* manually calls `featuredPlayerRef.current?.restart()`. If `shouldAutoPlay` was already `true`, the `useEffect` in QuestionMediaPlayer (line keying off `[autoPlay, type, audioUrl, videoUrl]`) won't re-fire. Calling `restart()` directly is the right move.

But the issue could be: `setShouldAutoPlay(false)` at line 378 in pause already set it to false. Then in resume `setShouldAutoPlay(true)` triggers the autoPlay useEffect → which after 200ms calls `doPlay()`. Combined with the immediate `restart()`, that's fine.

Now, one specific issue I notice: **`pauseInterview` only stops `featuredPlayerRef` if `duringQuestion` is true** (line 354). But `duringQuestion` is determined by `currentPresentationRef.current !== null`. This means **`featuredPlayerRef.current?.stop()` is correctly conditional**.

But there's a subtle bug — **when `setShouldAutoPlay(false)` runs at line 378 in pause**, the next time we set it back to `true`, the useEffect fires (autoPlay went false→true). That useEffect will trigger `doPlay()` 200ms later. But `restart()` is called immediately. So we have potential **double play** races.

Also, the **TTS replay** (line 406 `await speak(presentation.text)`) — the TTS text stored is whatever was last spoken (greeting OR question prompt). For media questions, the TTS is the AI greeting BEFORE the media plays. So if user pauses **during the media playback**, `currentPresentationRef` was overwritten to `{ kind: "media" }` by `markMediaPresentation()` — good. If user pauses **during the greeting TTS**, ref is `{ kind: "tts" }` — also good, and the resume correctly replays TTS then triggers media.

So looking again — the logic seems correct. The user reports the bug persists. Let me look at the user's exact report more carefully:

> "Quand on met en pause pendant que le **texte de la question est lue par l'IA** et qu'on reprend il faut que l'IA relise la question - on repart du début de la question. Que se soit une question texte lue, audio, ou video"

"Texte de la question lue par l'IA" → for written questions. For audio/video, it's pre-recorded media (not "lue par l'IA"). They want the same replay behavior in all 3 cases.

The TTS path should work in theory. Let me check live logs to see actual behavior.
<lov-tool-use id="toolu_vrtx_01Mk4BdAPcKXwuyccn39ShqW" name="code--read_console_logs" integration-id="code" data="{\"search\": \"interview\"}">
</lov-tool-use>
No logs (user is on /login). Let me check if there's something wrong with how `speak()` is awaited on resume. One potential issue: `speak()` calls `window.speechSynthesis.cancel()` at line 181. If user resumes while another TTS is somehow still pending, that's fine. But if `speak()` is called and the **safety timer fires immediately** (because no voices), the resume returns too fast.

Also another bug: at line 161, `currentPresentationRef.current = { kind: "tts", text }` is set **at the start of speak()**. But on completion (`safeResolve`), the ref is **never cleared**. So after speak() finishes naturally, ref still says "tts" with stale text. Then if user pauses during the listening phase, `pauseInterview` sees `currentPresentationRef.current !== null` → thinks we're "during question" → on resume, replays the OLD TTS text! That's a bug.

Let me check where ref is cleared.
<lov-tool-use id="toolu_vrtx_01C8zfJ655r6fZY14qVSV82r" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/InterviewStart.tsx\", \"query\": \"currentPresentationRef.current = null\"}">
</lov-tool-use>
Only ONE place clears the ref: `forceStartListening` (line 574). That means:

- When TTS for the **AI greeting** finishes naturally and we proceed to listening (without going through `forceStartListening`), the ref **stays** set to the old TTS text.
- Then if user pauses during listening, `duringQuestion` becomes `true` (ref not null), `wasDuringQuestion` is true, and on resume we **replay an old greeting TTS** instead of just resuming listening.

Conversely, when media plays and `onPlaybackEnd` fires → it goes through some flow that should clear. Let me check.
<lov-tool-use id="toolu_vrtx_01Ac2Mf668yEyXtDK97eiGVx" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/InterviewStart.tsx\", \"query\": \"onPlaybackEnd|forceStartListening|startListening\\\\(\\\\);|startQuestionRecording\"}">
</lov-tool-use>
Confirmed. Two critical bugs:

**Bug A (the one user reports):** For **written/text questions**, the flow is:
- Line 685-686: After greeting TTS, immediately `startQuestionRecording(); startListening();` — but **the question text itself is never spoken**. It's only displayed visually with `variant="featured"` written. The "TTS" only spoke the greeting/transition AI line, not the question content.

So when user says "le texte de la question est lue par l'IA" — this happens during the AI greeting/transition like "Voici la question 2: ...". Wait, let me check the greeting content for written questions.
<lov-tool-use id="toolu_vrtx_011SMAmWrsNu7f7bMpukSvon" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/InterviewStart.tsx\", \"lines\": \"640-700\"}">
</lov-tool-use>
Now I have full understanding. The greeting for written Q1 includes the question content: `"Commençons avec la première question : ${questions[0].content}"`. So the TTS for written questions DOES read the question.

**Key bugs identified:**

1. **Stale `currentPresentationRef` after TTS finishes** — never cleared on natural end. Result: pause during *listening phase* triggers a replay of the stale greeting/question TTS on resume.

2. **Resume after TTS replay → for written Q, missing flag** — at line 411-414, `resumeInterview` for written calls `startQuestionRecording(); startListening();` directly, but doesn't clear `currentPresentationRef.current = null`. So if user pauses again during listening, they get re-replay loop again.

3. **Transition AI messages** for Q2+ that include the next question's content via TTS — let me check.
<lov-tool-use id="toolu_vrtx_019DpqHikwstRm6sjR5ZZJN1" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/InterviewStart.tsx\", \"lines\": \"820-870\"}">
</lov-tool-use>
Confirmed. Now I have enough to write the plan. The existing implementation is mostly correct but has key gaps. Plan time.

<lov-plan>

## Plan : Corriger pause/reprise — relecture fiable de la question

### Diagnostic précis (après inspection du code actuel)

L'infrastructure de pause/reprise est en place mais **3 bugs subsistent** qui font que la relecture ne se déclenche pas correctement :

**Bug 1 — `currentPresentationRef` jamais nettoyée à la fin naturelle d'un TTS**
Dans `speak()`, on assigne `currentPresentationRef.current = { kind: "tts", text }` au début, mais `safeResolve()` (fin naturelle, onerror, safety timer) ne la remet **jamais à null**. Conséquence :
- Greeting Q1 se termine → ref reste pleine → utilisateur entre en phase d'écoute → met pause → `pauseInterview` voit `ref !== null` → pense "pendant question" → au resume, **rejoue le greeting au lieu de juste reprendre l'écoute**.

**Bug 2 — Resume après TTS ne nettoie pas la ref**
Dans `resumeInterview` branche TTS (lignes 411-414), après replay TTS pour question écrite, on enchaîne `startListening()` mais on **ne fait pas `currentPresentationRef.current = null`**. Conséquence :
- Pause #1 pendant TTS → resume → relit TTS → écoute → pause #2 pendant écoute → resume → **relit encore une fois la TTS**, boucle infinie possible.

**Bug 3 — Resume après replay média ne re-arme pas le tracking**
Dans la branche média (ligne 428-435), on appelle `restart()` mais on ne ré-appelle pas `markMediaPresentation()`. Si le `onPlaybackEnd` finit normalement et qu'on enchaîne, c'est OK. Mais si re-pause pendant le replay → `currentPresentationRef.current` peut être null si elle a été nettoyée entretemps par `forceStartListening`.

### Solution

**A. Nettoyer `currentPresentationRef` à la fin de chaque TTS**
Dans `speak()` → `safeResolve()`, ajouter `currentPresentationRef.current = null` avant `resolve()`. Ainsi la ref reflète vraiment "présentation en cours" et pas "dernière présentation".

**B. Nettoyer la ref dans `resumeInterview` après replay TTS pour question écrite**
Dans la branche `kind === "tts"` + `!hasMedia` (lignes 411-414), après `await speak()`, faire `currentPresentationRef.current = null` avant `startListening()`.

**C. Re-marquer la présentation média dans `resumeInterview` branche média**
Dans la branche `kind === "media"` (ligne 428-436), avant `restart()`, ré-appeler `markMediaPresentation(currentQuestionIndex)` pour garantir que la ref reste valide pendant le replay.

**D. Garder un ref `lastSpokenTextRef` séparé pour le replay**
Pour ne pas mélanger "ce qu'on est en train de dire" (utilisé par `pauseInterview` pour décider) et "ce qu'on doit rejouer" (texte du dernier TTS lancé) :
- `currentPresentationRef` = état courant (null quand TTS terminé), pour décider "duringQuestion"
- `lastSpokenTextRef` = mémoire du dernier texte (gardée jusqu'au prochain `speak()`), pour `resumeInterview`
- Au moment du pause, si `currentPresentationRef.current?.kind === "tts"`, on stocke le texte dans `pausedReplayRef` pour resume.

Approche plus simple que je retiens finalement : **garder `currentPresentationRef` mais la nettoyer à la fin du TTS**, et au moment du `pauseInterview`, **snapshot** la valeur dans un ref dédié `pausedReplayRef`. Ainsi `resumeInterview` lit `pausedReplayRef` (pas la ref live qui peut être nulle).

**E. Logs ciblés**
Garder les `console.log("[interview] ...")` existants, ajouter sur clear/snapshot pour tracer.

### Fichiers modifiés
- `src/pages/InterviewStart.tsx` — `speak()` clear ref à la fin, `pauseInterview` snapshot dans `pausedReplayRef`, `resumeInterview` lit `pausedReplayRef` et nettoie correctement après replay.

### Test final
1. Q1 écrite → pause **pendant** que l'IA lit la question → reprendre → l'IA relit toute la question depuis le début → écoute démarre. ✅
2. Q1 écrite → laisser l'IA finir → entrer en écoute → pause → reprendre → **pas de relecture**, juste reprise écoute. ✅ (bug 1 fixé)
3. Q audio → pause pendant lecture audio → reprendre → audio rejoué depuis 0. ✅
4. Q vidéo → pause pendant lecture vidéo → reprendre → vidéo rejouée depuis 0. ✅
5. Pause pendant greeting Q1 (avant que la question ne soit lue) → reprendre → greeting rejoué depuis "Bonjour…" puis enchaînement Q1. ✅
6. Double pause (pendant TTS, reprendre, re-pause pendant TTS) → chaque reprise relit depuis le début, pas de boucle. ✅
7. Vérifier logs `[interview] PAUSE — duringQuestion: true/false` cohérents avec l'état réel.

