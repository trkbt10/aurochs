/**
 * @file Vite config for the pages demo build.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "app"),
  publicDir: path.resolve(__dirname, "public"),
  base: "/aurochs/", // GitHub Pages base path (also used in dev)
  plugins: [react()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {},
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
