/**
 * @file Vite configuration for MCP UI bundle
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: resolve(__dirname, "ui-src"),
  build: {
    outDir: resolve(__dirname, "ui-dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "ui-src/index.html"),
    },
  },
});
