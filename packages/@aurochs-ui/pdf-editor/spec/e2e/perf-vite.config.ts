/**
 * @file Vite config for PDF editor performance E2E test server
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname),
  server: {
    port: 5182,
  },
  resolve: {
    alias: {
      "@aurochs-ui/pdf-editor": path.resolve(__dirname, "../../src"),
      "@aurochs-ui/editor-core": path.resolve(__dirname, "../../../editor-core/src"),
      "@aurochs-ui/editor-controls": path.resolve(__dirname, "../../../editor-controls/src"),
      "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),

      "@aurochs/pdf": path.resolve(__dirname, "../../../../@aurochs/pdf/src"),
      "@aurochs-renderer/pdf": path.resolve(__dirname, "../../../../@aurochs-renderer/pdf/src"),
      "@aurochs-builder/pdf": path.resolve(__dirname, "../../../../@aurochs-builder/pdf/src"),
    },
  },
  // Use perf-index.html as the entry point
  build: {
    rollupOptions: {
      input: path.join(__dirname, "perf-index.html"),
    },
  },
});
