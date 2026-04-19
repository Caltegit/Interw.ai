import { ensureSeed } from "./helpers/seed";

export default async function globalSetup() {
  console.log("[E2E] Seeding test data via edge function...");
  const result = await ensureSeed();
  console.log("[E2E] Seed OK:", result.credentials?.email);
}
