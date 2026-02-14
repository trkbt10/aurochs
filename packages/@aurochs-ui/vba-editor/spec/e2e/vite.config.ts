/**
 * @file Vite config for E2E test server
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname),
  server: {
    port: 5180,
  },
  resolve: {
    alias: {
      "@aurochs-ui/vba-editor": path.resolve(__dirname, "../../src"),
      "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),
      "@aurochs-ui/editor-core": path.resolve(__dirname, "../../../editor-core/src"),
      "@aurochs-ui/editor-controls": path.resolve(__dirname, "../../../editor-controls/src"),
      "@aurochs-office/vba": path.resolve(__dirname, "../../../../@aurochs-office/vba/src"),
    },
  },
});
