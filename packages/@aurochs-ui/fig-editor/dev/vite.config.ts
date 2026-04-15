/** @file Vite configuration for the fig-editor development server. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: { port: 5175 },
  build: {
    outDir: path.resolve(__dirname, "dist-dev"),
    emptyOutDir: true,
  },
});
