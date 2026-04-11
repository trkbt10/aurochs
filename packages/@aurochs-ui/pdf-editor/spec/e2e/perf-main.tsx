/**
 * @file Performance E2E test entry point
 *
 * Renders the PdfEditor with a large document (50+ pages).
 * The page count can be overridden via ?pages=N query parameter.
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { PdfEditor } from "@aurochs-ui/pdf-editor/editor";
import { createLargeDocument } from "./perf-fixture";

injectCSSVariables();

// Allow overriding page count via query parameter: ?pages=100
const params = new URLSearchParams(window.location.search);
const pageCount = parseInt(params.get("pages") ?? "50", 10);

const testDocument = createLargeDocument(pageCount);

// Expose document info for tests to query
(window as Record<string, unknown>).__perfDocumentInfo = {
  pageCount: testDocument.pages.length,
  elementsPerPage: testDocument.pages[0]?.elements.length ?? 0,
  totalElements: testDocument.pages.reduce((sum, p) => sum + p.elements.length, 0),
};

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
};

function App() {
  return (
    <div style={containerStyle} data-testid="pdf-editor-container">
      <PdfEditor document={testDocument} />
    </div>
  );
}

const startRender = performance.now();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Report initial render time
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const elapsed = performance.now() - startRender;
    (window as Record<string, unknown>).__initialRenderMs = elapsed;
    console.log(`[perf] Initial render: ${elapsed.toFixed(1)}ms (${pageCount} pages)`);
  });
});
