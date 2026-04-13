/**
 * @file E2E test harness — canvas only
 *
 * Renders FigEditorCanvas inside FigEditorProvider WITHOUT any panels
 * (PropertyPanel, LayerPanel, Toolbar). This isolates canvas text editing
 * from any PropertyPanel textarea interference and tests the canvas
 * interaction in the purest form.
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { FigEditorProvider } from "../../src/context/FigEditorContext";
import { FigEditorCanvas } from "../../src/canvas/FigEditorCanvas";
import type {
  FigDesignDocument,
  FigDesignNode,
  FigPage,
  FigNodeId,
  FigPageId,
} from "@aurochs/fig/domain";
import type { FigMatrix, KiwiEnumValue } from "@aurochs/fig/types";

injectCSSVariables();

// =============================================================================
// Node construction
// =============================================================================

function makeTransform(x: number, y: number): FigMatrix {
  return { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y };
}

function makeKiwiEnum(name: string, value: number): KiwiEnumValue {
  return { value, name } as KiwiEnumValue;
}

function makeTextNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  fontSize: number = 16,
  fontFamily: string = "Inter",
  fontStyle: string = "Regular",
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "TEXT",
    name: `Text: ${text.substring(0, 20)}`,
    visible: true,
    opacity: 1,
    transform: makeTransform(x, y),
    size: { x: width, y: height },
    fills: [
      {
        type: makeKiwiEnum("SOLID", 0),
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    textData: {
      characters: text,
      fontSize,
      fontName: { family: fontFamily, style: fontStyle, postscript: `${fontFamily}-${fontStyle}` },
      textAlignHorizontal: makeKiwiEnum("LEFT", 0),
      textAlignVertical: makeKiwiEnum("TOP", 0),
      textAutoResize: makeKiwiEnum("NONE", 2),
    },
  } as FigDesignNode;
}

function makeRectNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "RECTANGLE",
    name: "Rectangle",
    visible: true,
    opacity: 1,
    transform: makeTransform(x, y),
    size: { x: width, y: height },
    fills: [
      {
        type: makeKiwiEnum("SOLID", 0),
        color: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  } as FigDesignNode;
}

// =============================================================================
// Test document
// =============================================================================

const testPage: FigPage = {
  id: "page-1" as FigPageId,
  name: "Test Page",
  backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
  children: [
    makeTextNode("text-hello", 50, 50, 200, 30, "Hello World"),
    makeTextNode("text-multi", 50, 120, 250, 80, "Line one\nLine two\nLine three", 14),
    makeTextNode("text-empty", 50, 240, 200, 30, ""),
    makeRectNode("rect-1", 50, 310, 150, 80),
  ],
};

const testDocument: FigDesignDocument = {
  pages: [testPage],
  components: new Map(),
  images: new Map(),
  metadata: null,
};

// =============================================================================
// App — canvas only, no panels
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
};

function App() {
  return (
    <FigEditorProvider initialDocument={testDocument}>
      <div style={containerStyle}>
        <FigEditorCanvas />
      </div>
    </FigEditorProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
