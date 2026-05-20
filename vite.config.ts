import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// NE PAS RETIRER les en-têtes COOP/COEP : ils permettent à ffmpeg.wasm
// (export MP4 des vidéos d'entretien) d'utiliser SharedArrayBuffer si besoin
// et garantissent le mode crossOriginIsolated. Sans eux, la conversion MP4
// peut tomber en panne silencieuse — régression déjà vue plusieurs fois.
const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
