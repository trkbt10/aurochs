/**
 * @file Vite config for the PPTX visual test harness.
 * Serves a minimal page that renders SlideRenderer for screenshot capture.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    port: 9878, // Use high port to avoid conflicts
    strictPort: false,
  },
  resolve: {
    alias: {
      "@aurochs-ui/pptx-editor": path.resolve(__dirname, "../../src"),
      "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),
      "@aurochs-office/pptx/domain": path.resolve(__dirname, "../../../../@aurochs-office/pptx/src/domain"),
      "@aurochs-office/pptx": path.resolve(__dirname, "../../../../@aurochs-office/pptx/src"),
      "@aurochs-office/drawing-ml/domain/units": path.resolve(__dirname, "../../../../@aurochs-office/drawing-ml/src/domain/units"),
      "@aurochs-office/drawing-ml": path.resolve(__dirname, "../../../../@aurochs-office/drawing-ml/src"),
      "@aurochs-office/ooxml": path.resolve(__dirname, "../../../../@aurochs-office/ooxml/src"),
      "@aurochs-renderer/pptx/react": path.resolve(__dirname, "../../../../@aurochs-renderer/pptx/src/react"),
      "@aurochs-renderer/pptx": path.resolve(__dirname, "../../../../@aurochs-renderer/pptx/src"),
      "@aurochs-renderer/drawing-ml": path.resolve(__dirname, "../../../../@aurochs-renderer/drawing-ml/src"),
      "@aurochs/glyph": path.resolve(__dirname, "../../../../@aurochs/glyph/src"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  logLevel: "warn",
});
