/**
 * @file Vite config for Fig editor E2E test server
 *
 * Isolated dev server on port 5192, serving the test harness
 * that renders FigEditor with a synthetic document.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname),
  server: {
    port: 5192,
  },
  resolve: {
    alias: {
      "@aurochs-ui/fig-editor": path.resolve(__dirname, "../../src"),
      "@aurochs-ui/editor-core": path.resolve(__dirname, "../../../editor-core/src"),
      "@aurochs-ui/editor-controls": path.resolve(__dirname, "../../../editor-controls/src"),
      "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),
      "@aurochs-ui/color-editor": path.resolve(__dirname, "../../../color-editor/src"),
      "@aurochs/fig": path.resolve(__dirname, "../../../../@aurochs/fig/src"),
      "@aurochs-renderer/fig": path.resolve(__dirname, "../../../../@aurochs-renderer/fig/src"),
      "@aurochs-builder/fig": path.resolve(__dirname, "../../../../@aurochs-builder/fig/src"),
    },
  },
});
