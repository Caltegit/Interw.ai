import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
// COOP + COEP=credentialless : garde l'isolation cross-origin requise par
// ffmpeg.wasm (SharedArrayBuffer) tout en autorisant le chargement des vidéos
// hébergées sur Supabase Storage (qui ne renvoient pas Cross-Origin-Resource-Policy).
// `require-corp` bloquait toutes les vidéos d'entretien — régression confirmée.
const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: crossOriginIsolationHeaders,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
