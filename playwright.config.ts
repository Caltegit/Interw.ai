import { createLovableConfig } from "lovable-agent-playwright-config/config";

export default createLovableConfig({
  globalSetup: "./tests/e2e/global-setup.ts",
});
