/** @file Vite configuration for the PPTX editor development server. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: { port: 5180 },
  build: {
    outDir: path.resolve(__dirname, "dist-dev"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        viewer: path.resolve(__dirname, "pptx-viewer.html"),
        slideshow: path.resolve(__dirname, "pptx-slideshow.html"),
      },
    },
  },
});
