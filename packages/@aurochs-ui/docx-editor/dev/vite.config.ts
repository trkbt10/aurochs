/** @file Vite configuration for the DOCX editor development server. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: { port: 5181 },
  build: {
    outDir: path.resolve(__dirname, "dist-dev"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        editor: path.resolve(__dirname, "docx-editor.html"),
        "editor-ribbon": path.resolve(__dirname, "docx-editor-ribbon.html"),
        viewer: path.resolve(__dirname, "docx-viewer.html"),
      },
    },
  },
});
