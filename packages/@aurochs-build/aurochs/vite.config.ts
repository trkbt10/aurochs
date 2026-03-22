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
  // PPTX Extract
  "pptx/extract/index": resolve(__dirname, "../../@aurochs-office/pptx/src/extract/index.ts"),
  // PPTX Renderer
  "pptx/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/svg/index.ts"),
  "pptx/renderer/ascii/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/ascii/index.ts"),
  "pptx/renderer/mermaid/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/mermaid/index.ts"),
  "pptx/renderer/react/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/react/index.ts"),
  "pptx/renderer/animation/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/animation/index.ts"),
  "pptx/renderer/render-options/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/render-options.ts"),
  // PPTX Viewer
  "pptx/viewer/index": resolve(__dirname, "../../@aurochs-ui/pptx-editor/src/viewer/index.ts"),

  // DOCX Parser
  "docx/parser/index": resolve(__dirname, "../../@aurochs-office/docx/src/index.ts"),
  // DOCX Extract
  "docx/extract/index": resolve(__dirname, "../../@aurochs-office/docx/src/extract/index.ts"),
  // DOCX Renderer
  "docx/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/svg/index.ts"),
  "docx/renderer/ascii/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/ascii/index.ts"),
  "docx/renderer/mermaid/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/mermaid/index.ts"),
  "docx/renderer/react/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/react/index.ts"),
  "docx/renderer/render-options/index": resolve(__dirname, "../../@aurochs-renderer/docx/src/render-options.ts"),
  // DOCX Viewer
  "docx/viewer/index": resolve(__dirname, "../../@aurochs-ui/docx-editor/src/viewer/index.ts"),

  // XLSX Domain
  "xlsx/domain/index": resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/index.ts"),
  // XLSX Parser
  "xlsx/parser/index": resolve(__dirname, "../../@aurochs-office/xlsx/src/index.ts"),
  // XLSX Extract
  "xlsx/extract/index": resolve(__dirname, "../../@aurochs-office/xlsx/src/extract/index.ts"),
  // XLSX Renderer
  "xlsx/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/xlsx/src/svg/index.ts"),
  "xlsx/renderer/ascii/index": resolve(__dirname, "../../@aurochs-renderer/xlsx/src/ascii/index.ts"),
  "xlsx/renderer/mermaid/index": resolve(__dirname, "../../@aurochs-renderer/xlsx/src/mermaid/index.ts"),
  // XLSX Builder
  "xlsx/builder/index": resolve(__dirname, "../../@aurochs-builder/xlsx/src/index.ts"),
  // XLSX Viewer
  "xlsx/viewer/index": resolve(__dirname, "../../@aurochs-ui/xlsx-editor/src/viewer/index.ts"),

  // PDF Parser
  "pdf/parser/index": resolve(__dirname, "../../@aurochs/pdf/src/index.ts"),
  // PDF Writer
  "pdf/writer/index": resolve(__dirname, "../../@aurochs/pdf/src/writer/index.ts"),
  // PDF Builder
  "pdf/builder/index": resolve(__dirname, "../../@aurochs-builder/pdf/src/index.ts"),
  // PDF Renderer
  "pdf/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/pdf/src/svg/index.ts"),
  "pdf/renderer/react/index": resolve(__dirname, "../../@aurochs-renderer/pdf/src/react/index.ts"),
};

export default defineConfig({
  resolve: {
    // Use browser exports for conditional exports
    conditions: ["browser", "import", "default"],
  },
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
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/react/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/animation/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/render-options*"),
        resolve(__dirname, "../../@aurochs-ui/pptx-editor/src/viewer/**"),
        // DOCX
        resolve(__dirname, "../../@aurochs-office/docx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/react/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/render-options*"),
        resolve(__dirname, "../../@aurochs-ui/docx-editor/src/viewer/**"),
        // XLSX
        resolve(__dirname, "../../@aurochs-office/xlsx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-builder/xlsx/src/**"),
        resolve(__dirname, "../../@aurochs-ui/xlsx-editor/src/viewer/**"),
        // PDF
        resolve(__dirname, "../../@aurochs/pdf/src/**"),
        resolve(__dirname, "../../@aurochs-builder/pdf/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/pdf/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/pdf/src/react/**"),
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
      external: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/client",
        "react-dom/server",
        "react-dom/server.browser",
        "node:path",
        "node:fs/promises",
        // Node.js-only packages (not bundled for browser)
        "pngjs",
      ],
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
