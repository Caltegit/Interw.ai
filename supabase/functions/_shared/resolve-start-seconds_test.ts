import { assertEquals, assertAlmostEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveStartFactory } from "./resolve-start-seconds.ts";

// Helpers
const msg = (id: string, content: string, segments?: Array<{ start: number; end: number; text?: string }>) => ({
  id,
  role: "candidate" as const,
  content,
  transcript_segments: segments ?? null,
});

Deno.test("retourne null si messageId inconnu", () => {
  const r = resolveStartFactory([msg("a", "bonjour je suis ravi")]);
  assertEquals(r("zzz", "bonjour"), null);
});

Deno.test("retourne null si citation vide ou non trouvée", () => {
  const r = resolveStartFactory([msg("a", "bonjour je suis ravi")]);
  assertEquals(r("a", ""), null);
  assertEquals(r("a", "xyz introuvable"), null);
});

Deno.test("citation au début → 0s", () => {
  const r = resolveStartFactory([
    msg("a", "bonjour je suis ravi de vous rencontrer aujourd hui"),
  ]);
  assertEquals(r("a", "bonjour je suis"), 0);
});

Deno.test("citation au milieu : position proportionnelle × durée segments", () => {
  // 10 mots, segments donnent 20s de durée totale
  const r = resolveStartFactory([
    msg("a", "un deux trois quatre cinq six sept huit neuf dix", [
      { start: 0, end: 20, text: "un deux trois quatre cinq six sept huit neuf dix" },
    ]),
  ]);
  // "six" est en position 5 (0-based) → 5/10 = 50% → 10s
  const seconds = r("a", "six sept huit");
  assertAlmostEquals(seconds ?? -1, 10, 0.2);
});

Deno.test("fallback durée si aucun segment : 2,5 mots/s", () => {
  // 10 mots → durée estimée 4s, "six" à 50% → ~2s
  const r = resolveStartFactory([
    msg("a", "un deux trois quatre cinq six sept huit neuf dix"),
  ]);
  const seconds = r("a", "six sept");
  assertAlmostEquals(seconds ?? -1, 2, 0.2);
});

Deno.test("normalisation accents + casse + ponctuation", () => {
  const r = resolveStartFactory([
    msg("a", "Bonjour, je m'appelle Élise et je suis développeuse."),
  ]);
  const seconds = r("a", "je m appelle elise");
  // "je" est le 2e mot (idx 1) sur 8 → 12.5% × ~3.2s ≈ 0.4s
  assertEquals(typeof seconds, "number");
  assertEquals((seconds ?? -1) > 0, true);
});

Deno.test("plusieurs occurrences : on garde celle dont la suite chevauche le plus", () => {
  // "je" apparaît plusieurs fois ; la citation longue "je suis développeur ravi"
  // doit pointer sur la 2e occurrence.
  const r = resolveStartFactory([
    msg(
      "a",
      "je travaille beaucoup et je suis developpeur ravi de partager",
    ),
  ]);
  const seconds = r("a", "je suis developpeur ravi");
  // idx attendu = 4 (mot "je" du 2e bloc), sur 10 mots → 40% × 4s ≈ 1.6s
  assertAlmostEquals(seconds ?? -1, 1.6, 0.3);
});
