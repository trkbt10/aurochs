import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: { port: 5182 },
  build: {
    outDir: path.resolve(__dirname, "dist-dev"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        editor: path.resolve(__dirname, "xlsx-editor.html"),
        viewer: path.resolve(__dirname, "xlsx-viewer.html"),
      },
    },
  },
});
