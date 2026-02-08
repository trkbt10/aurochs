/**
 * @file Vite config for the WebGL test harness.
 * Serves a minimal page that renders SceneGraph via WebGL.
 */

import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  server: {
    port: 0, // auto-assign
    strictPort: false,
  },
});
