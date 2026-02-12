/**
 * @file Vite config for visual tests
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5175,
  },
  resolve: {
    alias: {},
  },
});
