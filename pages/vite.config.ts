import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "app"),
  publicDir: path.resolve(__dirname, "public"),
  base: "/web-pptx/", // GitHub Pages base path
  plugins: [react()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
