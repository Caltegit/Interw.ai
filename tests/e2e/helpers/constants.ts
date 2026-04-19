// Fixed IDs / values matching supabase/functions/seed-e2e-user
export const SEED = {
  email: process.env.E2E_TEST_EMAIL ?? "e2e-test@interw.ai",
  password: process.env.E2E_TEST_PASSWORD ?? "E2eTest!2026",
  orgSlug: "e2e-test-org",
  projectId: "e2e0e2e0-0000-0000-0000-000000000010",
  projectSlug: "e2e-test-project",
  sessionId: "e2e0e2e0-0000-0000-0000-000000000040",
} as const;

export const BASE_URL =
  process.env.E2E_BASE_URL ?? "https://id-preview--d507061f-79c5-4010-a44e-dcd95586a736.lovable.app";

export const SUPABASE_URL = "https://qxszgsxdktnwqabsdfvw.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3pnc3hka3Rud3FhYnNkZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Njk3NTIsImV4cCI6MjA5MTI0NTc1Mn0.XBZ_DR9I6yX2O2w4CXzXpl1mSTgtRALs6i0EPlUBzQA";
