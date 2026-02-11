import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

/**
 * Publish 用パッケージのビルド設定
 *
 * エントリポイント: {format}/{context}/{type}
 * - pptx/renderer/svg
 * - pptx/renderer/ascii
 * - pptx/renderer/mermaid
 * - pptx/viewer
 *
 * 将来追加時はこの配列に追加するだけ
 */
const entries = {
  // PPTX Parser
  "pptx/parser/index": resolve(__dirname, "../../@aurochs-office/pptx/src/index.ts"),
  // PPTX Renderer
  "pptx/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/svg/index.ts"),
  "pptx/renderer/ascii/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/ascii/index.ts"),
  "pptx/renderer/mermaid/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/mermaid/index.ts"),
  // PPTX Viewer
  "pptx/viewer/index": resolve(__dirname, "../../@aurochs-ui/pptx-editor/src/viewer/index.ts"),
};

export default defineConfig({
  plugins: [
    dts({
      outDir: resolve(__dirname, "../../../publish/aurochs/dist"),
      tsconfigPath: resolve(__dirname, "../../../tsconfig.json"),
      include: [
        resolve(__dirname, "../../@aurochs-office/pptx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-ui/pptx-editor/src/viewer/**"),
      ],
    }),
  ],
  build: {
    outDir: resolve(__dirname, "../../../publish/aurochs/dist"),
    emptyDirBeforeWrite: true,
    lib: {
      entry: entries,
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        preserveModules: false,
        entryFileNames: "[name].js",
        chunkFileNames: "_shared/[name]-[hash].js",
      },
    },
    minify: false,
    sourcemap: true,
  },
});
