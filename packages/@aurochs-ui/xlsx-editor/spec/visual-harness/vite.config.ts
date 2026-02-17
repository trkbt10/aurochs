/**
 * @file Vite config for the XLSX visual test harness.
 * Serves a minimal page that renders XlsxWorkbookEditor for screenshot capture.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    port: 9876, // Use high port to avoid conflicts
    strictPort: false,
  },
  resolve: {
    alias: {
      "@aurochs-ui/xlsx-editor": path.resolve(__dirname, "../../src"),
      "@aurochs-ui/ui-components": path.resolve(__dirname, "../../../ui-components/src"),
      "@aurochs-office/xlsx": path.resolve(__dirname, "../../../../@aurochs-office/xlsx/src"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
