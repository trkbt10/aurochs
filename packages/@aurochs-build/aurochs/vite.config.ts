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

  // DOCX Parser
  "docx/parser/index": resolve(__dirname, "../../@aurochs-office/docx/src/index.ts"),
  // DOCX Renderer
  "docx/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/svg/index.ts"),
  "docx/renderer/ascii/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/ascii/index.ts"),
  "docx/renderer/mermaid/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/mermaid/index.ts"),
  // DOCX Viewer
  "docx/viewer/index": resolve(__dirname, "../../@aurochs-ui/docx-editor/src/viewer/index.ts"),

  // XLSX Parser
  "xlsx/parser/index": resolve(__dirname, "../../@aurochs-office/xlsx/src/index.ts"),
  // XLSX Renderer
  "xlsx/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/xlsx/src/svg/index.ts"),
  "xlsx/renderer/ascii/index": resolve(__dirname, "../../@aurochs-renderer/xlsx/src/ascii/index.ts"),
  "xlsx/renderer/mermaid/index": resolve(__dirname, "../../@aurochs-renderer/xlsx/src/mermaid/index.ts"),
  // XLSX Viewer
  "xlsx/viewer/index": resolve(__dirname, "../../@aurochs-ui/xlsx-editor/src/viewer/index.ts"),
};

export default defineConfig({
  plugins: [
    dts({
      outDir: resolve(__dirname, "../../../publish/aurochs/dist"),
      tsconfigPath: resolve(__dirname, "../../../tsconfig.json"),
      include: [
        // PPTX
        resolve(__dirname, "../../@aurochs-office/pptx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-ui/pptx-editor/src/viewer/**"),
        // DOCX
        resolve(__dirname, "../../@aurochs-office/docx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-ui/docx-editor/src/viewer/**"),
        // XLSX
        resolve(__dirname, "../../@aurochs-office/xlsx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-ui/xlsx-editor/src/viewer/**"),
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
