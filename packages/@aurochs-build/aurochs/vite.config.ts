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
  // DrawingML Domain (shared types, input specs, conversions)
  "drawing-ml/domain/index": resolve(__dirname, "../../@aurochs-office/drawing-ml/src/domain/index.ts"),
  // PPTX Builder
  "pptx/builder/index": resolve(__dirname, "../../@aurochs-builder/pptx/src/index.ts"),
  // DrawingML element editors (from @aurochs-ui/ooxml-components/drawing-ml)
  "drawing-ml/editors/index": resolve(__dirname, "../../@aurochs-ui/ooxml-components/src/drawing-ml/index.ts"),
  // PPTX slide-level editors (from @aurochs-ui/ooxml-components/pptx-slide)
  "pptx/slide-editors/index": resolve(__dirname, "../../@aurochs-ui/ooxml-components/src/pptx-slide/index.ts"),
  // PPTX Slide Canvas (from @aurochs-ui/pptx-slide-canvas)
  "pptx/slide-canvas/index": resolve(__dirname, "../../@aurochs-ui/pptx-slide-canvas/src/index.ts"),
  // PPTX Viewer (from @aurochs-ui/pptx-viewer)
  "pptx/viewer/index": resolve(__dirname, "../../@aurochs-ui/pptx-viewer/src/index.ts"),
  // PPTX Slide List (from @aurochs-ui/pptx-viewer/slide-list)
  "pptx/viewer/slide-list/index": resolve(__dirname, "../../@aurochs-ui/pptx-viewer/src/slide-list/index.ts"),

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

  // XLSX Domain (types + constructors)
  "xlsx/domain/index": resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/index.ts"),
  // XLSX Domain Style (type-only — ensures .d.ts generation for color, font, fill, border)
  "xlsx/domain/style/color": resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/style/color.ts"),
  "xlsx/domain/style/font": resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/style/font.ts"),
  "xlsx/domain/style/fill": resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/style/fill.ts"),
  "xlsx/domain/style/border": resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/style/border.ts"),
  // XLSX Parser (simple - for chart data)
  "xlsx/parser/index": resolve(__dirname, "../../@aurochs-office/xlsx/src/index.ts"),
  // XLSX Parser (full domain model)
  "xlsx/parser/full/index": resolve(__dirname, "../../@aurochs-office/xlsx/src/parser/index.ts"),
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

  // ZIP Utilities
  "zip/index": resolve(__dirname, "../../@aurochs/zip/src/index.ts"),

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
      entryRoot: resolve(__dirname, "../.."),
      include: [
        // PPTX
        resolve(__dirname, "../../@aurochs-office/pptx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/react/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/animation/**"),
        resolve(__dirname, "../../@aurochs-renderer/pptx/src/render-options*"),
        resolve(__dirname, "../../@aurochs-builder/pptx/src/**"),
        resolve(__dirname, "../../@aurochs-office/drawing-ml/src/domain/**"),
        resolve(__dirname, "../../@aurochs-builder/drawing-ml/src/**"),
        resolve(__dirname, "../../@aurochs-builder/core/src/**"),
        resolve(__dirname, "../../@aurochs-builder/chart/src/**"),
        resolve(__dirname, "../../@aurochs-ui/ooxml-components/src/**"),
        resolve(__dirname, "../../@aurochs-ui/pptx-slide-canvas/src/**"),
        resolve(__dirname, "../../@aurochs-ui/pptx-viewer/src/**"),
        // DOCX
        resolve(__dirname, "../../@aurochs-office/docx/src/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/react/**"),
        resolve(__dirname, "../../@aurochs-renderer/docx/src/render-options*"),
        resolve(__dirname, "../../@aurochs-ui/docx-editor/src/viewer/**"),
        // XLSX (domain + style + drawing subdirectories explicitly)
        resolve(__dirname, "../../@aurochs-office/xlsx/src/**"),
        resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/**"),
        resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/style/**"),
        resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/cell/**"),
        resolve(__dirname, "../../@aurochs-office/xlsx/src/domain/drawing/**"),
        resolve(__dirname, "../../@aurochs-office/xlsx/src/parser/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/svg/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/ascii/**"),
        resolve(__dirname, "../../@aurochs-renderer/xlsx/src/mermaid/**"),
        resolve(__dirname, "../../@aurochs-builder/xlsx/src/**"),
        resolve(__dirname, "../../@aurochs-ui/xlsx-editor/src/viewer/**"),
        // ZIP
        resolve(__dirname, "../../@aurochs/zip/src/**"),
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
