/**
 * @file E2E test entry point for PDF editor
 *
 * Provides a synthetic PdfDocument with text, path, and image elements
 * to exercise selection, text editing, resize, move, and rotate.
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { PdfEditor } from "@aurochs-ui/pdf-editor/editor";
import type { PdfDocument, PdfPage, PdfText, PdfPath, PdfGraphicsState } from "@aurochs/pdf";

injectCSSVariables();

// =============================================================================
// Default graphics state factory
// =============================================================================

function makeGraphicsState(overrides?: Partial<PdfGraphicsState>): PdfGraphicsState {
  return {
    ctm: [1, 0, 0, 1, 0, 0],
    fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
    strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
    lineWidth: 1,
    lineJoin: 0,
    lineCap: 0,
    miterLimit: 10,
    dashArray: [],
    dashPhase: 0,
    fillAlpha: 1,
    strokeAlpha: 1,
    charSpacing: 0,
    wordSpacing: 0,
    horizontalScaling: 100,
    textLeading: 0,
    textRenderingMode: 0,
    textRise: 0,
    ...overrides,
  };
}

// =============================================================================
// Test fixture: PdfDocument with inline text, block text, path, and shapes
// =============================================================================

/**
 * Inline text element (single line, short).
 * Position: top-left area of page.
 */
const inlineText: PdfText = {
  type: "text",
  text: "Hello World",
  x: 72,
  y: 650,
  width: 120,
  height: 14,
  fontName: "F1",
  baseFont: "Helvetica",
  fontSize: 14,
  fontMetrics: { ascender: 800, descender: -200 },
  graphicsState: makeGraphicsState(),
};

/**
 * Block text element (multi-word, simulating a paragraph).
 * Position: center area.
 */
const blockText: PdfText = {
  type: "text",
  text: "The quick brown fox jumps over the lazy dog. This is a longer block of text for testing.",
  x: 72,
  y: 550,
  width: 400,
  height: 14,
  fontName: "F1",
  baseFont: "Helvetica",
  fontSize: 14,
  fontMetrics: { ascender: 800, descender: -200 },
  graphicsState: makeGraphicsState(),
};

/**
 * Bold red text for style detection tests.
 */
const styledText: PdfText = {
  type: "text",
  text: "Styled Bold Red",
  x: 72,
  y: 450,
  width: 140,
  height: 16,
  fontName: "F2",
  baseFont: "Helvetica-Bold",
  fontSize: 16,
  isBold: true,
  fontMetrics: { ascender: 800, descender: -200 },
  graphicsState: makeGraphicsState({
    fillColor: { colorSpace: "DeviceRGB", components: [1, 0, 0] },
  }),
};

/**
 * Another text element for multi-select tests.
 */
const secondaryText: PdfText = {
  type: "text",
  text: "Secondary text element",
  x: 72,
  y: 350,
  width: 180,
  height: 12,
  fontName: "F1",
  baseFont: "Helvetica",
  fontSize: 12,
  fontMetrics: { ascender: 800, descender: -200 },
  graphicsState: makeGraphicsState(),
};

/**
 * Rectangle path element for move/resize/rotate tests.
 */
const rectPath: PdfPath = {
  type: "path",
  operations: [
    { type: "rect", x: 300, y: 300, width: 150, height: 100 },
  ],
  paintOp: "fillStroke",
  graphicsState: makeGraphicsState({
    fillColor: { colorSpace: "DeviceRGB", components: [0.2, 0.6, 1.0] },
    strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 0.5] },
    lineWidth: 2,
  }),
};

const testPage: PdfPage = {
  pageNumber: 1,
  width: 612,   // US Letter width in points
  height: 792,  // US Letter height in points
  elements: [inlineText, blockText, styledText, secondaryText, rectPath],
};

const secondPage: PdfPage = {
  pageNumber: 2,
  width: 612,
  height: 792,
  elements: [
    {
      type: "text",
      text: "Page two content",
      x: 72,
      y: 650,
      width: 140,
      height: 14,
      fontName: "F1",
      baseFont: "Helvetica",
      fontSize: 14,
      fontMetrics: { ascender: 800, descender: -200 },
      graphicsState: makeGraphicsState(),
    } satisfies PdfText,
  ],
};

const testDocument: PdfDocument = {
  pages: [testPage, secondPage],
};

// =============================================================================
// App
// =============================================================================

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
