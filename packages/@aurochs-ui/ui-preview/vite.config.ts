/**
 * @file Vite config for the UI Preview dev server (MPA).
 *
 * Each @aurochs-ui package has its own HTML entry point.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
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
        "docx-editor": path.resolve(__dirname, "docx-editor.html"),
        "editor-controls": path.resolve(__dirname, "editor-controls.html"),
      },
    },
  },
});
