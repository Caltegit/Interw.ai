import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants";

/**
 * Calls the seed-e2e-user edge function to (re)create test data.
 * Idempotent. Should be called once before the test suite runs (globalSetup).
 */
export async function ensureSeed() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/seed-e2e-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: "{}",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(`Seed failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}
