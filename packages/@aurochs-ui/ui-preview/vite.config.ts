/**
 * @file Vite config for the UI Preview dev server (MPA).
 *
 * Aggregation hub — HTML entry points reference each package's dev/ entry directly.
 * Root is set to packages/@aurochs-ui/ so all sibling packages are accessible.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const aurachsUiRoot = path.resolve(__dirname, "..");

export default defineConfig({
  root: aurachsUiRoot,
  plugins: [react()],
  server: {
    port: 5178,
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        "xlsx-editor": path.resolve(__dirname, "xlsx-editor.html"),
        "xlsx-viewer": path.resolve(__dirname, "xlsx-viewer.html"),
        "docx-editor": path.resolve(__dirname, "docx-editor.html"),
        "docx-viewer": path.resolve(__dirname, "docx-viewer.html"),
        "pptx-slideshow": path.resolve(__dirname, "pptx-slideshow.html"),
        "pptx-viewer": path.resolve(__dirname, "pptx-viewer.html"),
        "editor-controls": path.resolve(__dirname, "editor-controls.html"),
        "ui-components": path.resolve(__dirname, "ui-components.html"),
        "vba-editor": path.resolve(__dirname, "vba-editor.html"),
      },
    },
  },
});
