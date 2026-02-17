/**
 * @file Vite config for the DOCX visual test harness.
 * Serves a minimal page that renders PageRenderer for screenshot capture.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    port: 9877, // Use high port to avoid conflicts
    strictPort: false,
  },
  resolve: {
    alias: {
      "@aurochs-ui/docx-editor": path.resolve(__dirname, "../../src"),
      "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),
      "@aurochs-office/docx/domain": path.resolve(__dirname, "../../../../@aurochs-office/docx/src/domain"),
      "@aurochs-office/docx": path.resolve(__dirname, "../../../../@aurochs-office/docx/src"),
      "@aurochs-office/text-layout": path.resolve(__dirname, "../../../../@aurochs-office/text-layout/src"),
      "@aurochs-office/drawing-ml": path.resolve(__dirname, "../../../../@aurochs-office/drawing-ml/src"),
      "@aurochs-renderer/docx/react": path.resolve(__dirname, "../../../../@aurochs-renderer/docx/src/react"),
      "@aurochs-renderer/docx": path.resolve(__dirname, "../../../../@aurochs-renderer/docx/src"),
      "@aurochs-renderer/drawing-ml": path.resolve(__dirname, "../../../../@aurochs-renderer/drawing-ml/src"),
      "@aurochs/glyph": path.resolve(__dirname, "../../../../@aurochs/glyph/src"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  logLevel: "warn",
});
