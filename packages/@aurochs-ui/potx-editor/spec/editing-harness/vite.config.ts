/**
 * @file Vite config for the potx-editor editing E2E harness.
 *
 * Uses empty alias (same as pages/vite.config.ts) so that Vite resolves
 * workspace packages via package.json exports fields directly.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    port: 39999,
    strictPort: false,
  },
  resolve: {
    alias: {},
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  logLevel: "warn",
});
