/**
 * @file Vite config for TextEditController E2E test server
 *
 * Isolated dev server on port 5193, serving a minimal harness
 * that renders TextEditController with a synthetic multi-style TextBody.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname),
  server: {
    port: 5193,
  },
  resolve: {
    alias: {
      // UI packages
      "@aurochs-ui/ooxml-components": path.resolve(__dirname, "../../src"),
      "@aurochs-ui/editor-core": path.resolve(__dirname, "../../../editor-core/src"),
      "@aurochs-ui/editor-controls": path.resolve(__dirname, "../../../editor-controls/src"),
      "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),
      // Renderer packages
      "@aurochs-renderer/pptx/react": path.resolve(__dirname, "../../../../@aurochs-renderer/pptx/src/react"),
      "@aurochs-renderer/pptx": path.resolve(__dirname, "../../../../@aurochs-renderer/pptx/src"),
      "@aurochs-renderer/drawing-ml": path.resolve(__dirname, "../../../../@aurochs-renderer/drawing-ml/src"),
      "@aurochs-renderer/svg": path.resolve(__dirname, "../../../../@aurochs-renderer/svg/src"),
      "@aurochs-renderer/diagram": path.resolve(__dirname, "../../../../@aurochs-renderer/diagram/src"),
      // Office domain packages
      "@aurochs-office/pptx/domain": path.resolve(__dirname, "../../../../@aurochs-office/pptx/src/domain"),
      "@aurochs-office/pptx": path.resolve(__dirname, "../../../../@aurochs-office/pptx/src"),
      "@aurochs-office/drawing-ml/domain/units": path.resolve(__dirname, "../../../../@aurochs-office/drawing-ml/src/domain/units"),
      "@aurochs-office/drawing-ml": path.resolve(__dirname, "../../../../@aurochs-office/drawing-ml/src"),
      "@aurochs-office/ooxml": path.resolve(__dirname, "../../../../@aurochs-office/ooxml/src"),
      // Other
      "@aurochs/glyph": path.resolve(__dirname, "../../../../@aurochs/glyph/src"),
    },
  },
});
