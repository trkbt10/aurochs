/**
 * @file E2E test harness — canvas only
 *
 * Renders FigEditorCanvas inside FigEditorProvider with only the toolbar.
 * This isolates canvas text editing from PropertyPanel textarea interference
 * while still covering first-class tool selection from the UI.
 */

import { StrictMode, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { injectCSSVariables } from "@aurochs-ui/ui-components/design-tokens";
import { FigEditorProvider } from "../../src/context/FigEditorContext";
import { FigEditorCanvas } from "../../src/canvas/FigEditorCanvas";
import { FigEditorToolbar } from "../../src/editor/FigEditorToolbar";
import { PropertyPanel } from "../../src/panels/PropertyPanel";
import { PageListPanel } from "../../src/panels/PageListPanel";
import { LayerPanel } from "../../src/panels/LayerPanel";
import type { FigEditorRendererKind } from "../../src/canvas/renderer-kind";
import type {
  FigDesignDocument,
  FigDesignNode,
  FigPage,
  FigNodeId,
  FigPageId,
} from "@aurochs/fig/domain";
import { EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import type { FigImage } from "@aurochs/fig/parser";
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

type MakeTextNodeOptions = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly fontStyle?: string;
};

function makeTextNode(
  { id, x, y, width, height, text, fontSize = 16, fontFamily = "Inter", fontStyle = "Regular" }: MakeTextNodeOptions,
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
        type: "SOLID",
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

type MakeRectNodeOptions = {
  readonly id: string;
  readonly type?: "RECTANGLE" | "ELLIPSE" | "LINE";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function makeRectNode(
  { id, type = "RECTANGLE", x, y, width, height }: MakeRectNodeOptions,
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type,
    name: resolveShapeName(type),
    visible: true,
    opacity: 1,
    transform: makeTransform(x, y),
    size: { x: width, y: height },
    fills: [
      {
        type: "SOLID",
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

const TEST_IMAGE_REF = "fixture-image.png";
const TEST_IMAGE: FigImage = {
  ref: TEST_IMAGE_REF,
  mimeType: "image/png",
  data: createFixtureImageBytes(),
};

function makeImageFillNode(): FigDesignNode {
  return {
    ...makeRectNode({ id: "image-fill-rect", x: 960, y: 310, width: 90, height: 70 }),
    name: "Image Fill Rect",
    fills: [{
      type: "IMAGE",
      imageRef: TEST_IMAGE_REF,
      scaleMode: "FILL",
      opacity: 1,
      visible: true,
    }],
  } as FigDesignNode;
}

function resolveShapeName(type: "RECTANGLE" | "ELLIPSE" | "LINE"): string {
  switch (type) {
    case "ELLIPSE":
      return "Ellipse";
    case "LINE":
      return "Line";
    case "RECTANGLE":
      return "Rectangle";
  }
}

type MakeVectorNodeOptions = {
  readonly id?: string;
  readonly name?: string;
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly pathData?: string;
};

function makeVectorNode(
  {
    id = "vector-1",
    name = "Editable Vector",
    x = 330,
    y = 310,
    width = 120,
    height = 100,
    pathData = "M 0 0 C 60 0 80 20 100 40 L 70 90 L 0 70 Z",
  }: MakeVectorNodeOptions = {},
): FigDesignNode {
  return {
    id: id as FigNodeId,
    type: "VECTOR",
    name,
    visible: true,
    opacity: 1,
    transform: makeTransform(x, y),
    size: { x: width, y: height },
    vectorPaths: [{
      windingRule: "NONZERO",
      data: pathData,
    }],
    fills: [
      {
        type: "SOLID",
        color: { r: 0.55, g: 0.72, b: 0.95, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  } as FigDesignNode;
}

function makeNestedFrameNode(): FigDesignNode {
  return {
    id: "frame-1" as FigNodeId,
    type: "FRAME",
    name: "Nested Frame",
    visible: true,
    opacity: 1,
    transform: makeTransform(520, 300),
    size: { x: 220, y: 150 },
    fills: [
      {
        type: "SOLID",
        color: { r: 0.94, g: 0.96, b: 0.98, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    children: [makeInnerFrameNode()],
  } as FigDesignNode;
}

function makeInnerFrameNode(): FigDesignNode {
  return {
    id: "inner-frame-1" as FigNodeId,
    type: "FRAME",
    name: "Inner Frame",
    visible: true,
    opacity: 1,
    transform: makeTransform(28, 22),
    size: { x: 160, y: 110 },
    fills: [
      {
        type: "SOLID",
        color: { r: 0.88, g: 0.91, b: 0.95, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    children: [makeFrameChildRectNode(), makeFrameChildVectorNode()],
  } as FigDesignNode;
}

function makeFrameChildRectNode(): FigDesignNode {
  return {
    id: "frame-child-rect" as FigNodeId,
    type: "RECTANGLE",
    name: "Frame Child Rect",
    visible: true,
    opacity: 1,
    transform: makeTransform(34, 28),
    size: { x: 92, y: 58 },
    fills: [
      {
        type: "SOLID",
        color: { r: 0.25, g: 0.65, b: 0.43, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
    strokes: [],
    strokeWeight: 0,
    effects: [],
  } as FigDesignNode;
}

function makeFrameChildVectorNode(): FigDesignNode {
  return makeVectorNode({
    id: "frame-child-vector",
    name: "Frame Child Vector",
    x: 98,
    y: 18,
    width: 58,
    height: 42,
    pathData: "M 0 0 C 25 0 45 12 50 24 L 32 40 L 0 30 Z",
  });
}

function makeCoveringGroupNode(): FigDesignNode {
  return {
    id: "covering-group-1" as FigNodeId,
    type: "GROUP",
    name: "Covering Group",
    visible: true,
    opacity: 1,
    transform: makeTransform(760, 300),
    size: { x: 170, y: 120 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    children: [
      {
        ...makeRectNode({ id: "group-child-rect", x: 24, y: 26, width: 90, height: 54 }),
        name: "Group Child Rect",
      },
      makeVectorNode({
        id: "group-child-vector",
        name: "Group Child Vector",
        x: 92,
        y: 40,
        width: 52,
        height: 38,
        pathData: "M 0 0 C 20 0 44 8 48 22 L 25 36 L 0 26 Z",
      }),
    ],
  } as FigDesignNode;
}

const COMPONENT_ID = "20:1" as FigNodeId;
const COMPONENT_LABEL_DEF_ID = "20:10" as FigNodeId;
const COMPONENT_ICON_DEF_ID = "20:11" as FigNodeId;
const COMPONENT_ICON_VISIBLE_DEF_ID = "20:12" as FigNodeId;
const COMPONENT_VARIANT_DEF_ID = "20:13" as FigNodeId;
const ICON_A_ID = "21:1" as FigNodeId;
const ICON_B_ID = "21:2" as FigNodeId;
const COMPONENT_SET_ID = "30:1" as FigNodeId;
const COMPONENT_SET_VARIANT_DEF_ID = "30:10" as FigNodeId;

function makeIconComponent(id: FigNodeId, name: string, fill: FigDesignNode["fills"][number]): FigDesignNode {
  return {
    ...makeRectNode({ id, x: 0, y: 0, width: 18, height: 18 }),
    id,
    type: "COMPONENT",
    name,
    fills: [fill],
  } as FigDesignNode;
}

function makeComponentSymbol(): FigDesignNode {
  return {
    id: COMPONENT_ID,
    type: "COMPONENT",
    name: "Button Component",
    visible: true,
    opacity: 1,
    transform: makeTransform(0, 0),
    size: { x: 180, y: 60 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    componentPropertyDefs: [
      {
        id: COMPONENT_LABEL_DEF_ID,
        name: "Label",
        type: "TEXT",
        initialValue: { textValue: { characters: "Default label" } },
      },
      {
        id: COMPONENT_ICON_DEF_ID,
        name: "Icon",
        type: "INSTANCE_SWAP",
        initialValue: { referenceValue: ICON_A_ID },
      },
      {
        id: COMPONENT_ICON_VISIBLE_DEF_ID,
        name: "Show icon",
        type: "BOOL",
        initialValue: { boolValue: true },
      },
      {
        id: COMPONENT_VARIANT_DEF_ID,
        name: "State",
        type: "VARIANT",
        initialValue: { referenceValue: COMPONENT_ID },
      },
    ],
    children: [
      {
        ...makeRectNode({ id: "20:2", x: 0, y: 0, width: 180, height: 60 }),
        name: "Button Background",
        fills: [{ type: "SOLID", color: { r: 0.92, g: 0.95, b: 1, a: 1 }, opacity: 1, visible: true }],
      } as FigDesignNode,
      {
        ...makeTextNode({ id: "20:3", x: 48, y: 20, width: 110, height: 22, text: "Default label", fontSize: 16 }),
        name: "Button Label",
        componentPropertyRefs: [{ defId: COMPONENT_LABEL_DEF_ID, nodeField: "TEXT_DATA" }],
      } as FigDesignNode,
      {
        id: "20:4" as FigNodeId,
        type: "INSTANCE",
        name: "Button Icon",
        visible: true,
        opacity: 1,
        transform: makeTransform(18, 21),
        size: { x: 18, y: 18 },
        fills: [],
        strokes: [],
        strokeWeight: 0,
        effects: [],
        symbolId: ICON_A_ID,
        componentPropertyRefs: [
          { defId: COMPONENT_ICON_DEF_ID, nodeField: "OVERRIDDEN_SYMBOL_ID" },
          { defId: COMPONENT_ICON_VISIBLE_DEF_ID, nodeField: "VISIBLE" },
        ],
      } as FigDesignNode,
    ],
  } as FigDesignNode;
}

function makeComponentInstanceNode(): FigDesignNode {
  return {
    id: "22:1" as FigNodeId,
    type: "INSTANCE",
    name: "Button Instance",
    visible: true,
    opacity: 1,
    transform: makeTransform(760, 70),
    size: { x: 180, y: 60 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    symbolId: COMPONENT_ID,
  } as FigDesignNode;
}

function makeSectionNode(): FigDesignNode {
  return {
    id: "section-1" as FigNodeId,
    type: "SECTION",
    name: "Editable Section",
    visible: true,
    opacity: 1,
    transform: makeTransform(760, 170),
    size: { x: 180, y: 90 },
    fills: [{ type: "SOLID", color: { r: 0.96, g: 0.91, b: 0.72, a: 1 }, opacity: 1, visible: true }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    sectionContentsHidden: false,
  } as FigDesignNode;
}

function makeVariantComponentNode(): FigDesignNode {
  return {
    ...makeRectNode({ id: "variant-component", x: 960, y: 80, width: 150, height: 70 }),
    type: "COMPONENT",
    name: "Variant Component",
    fills: [{ type: "SOLID", color: { r: 0.82, g: 0.74, b: 0.96, a: 1 }, opacity: 1, visible: true }],
    variantPropSpecs: [{ propDefId: COMPONENT_VARIANT_DEF_ID, value: "Default" }],
  } as FigDesignNode;
}

function makeComponentSetNode(): FigDesignNode {
  const defaultVariant = {
    ...makeRectNode({ id: "30:2", x: 12, y: 18, width: 90, height: 48 }),
    type: "COMPONENT",
    name: "Primary",
    fills: [{ type: "SOLID", color: { r: 0.78, g: 0.88, b: 1, a: 1 }, opacity: 1, visible: true }],
    variantPropSpecs: [{ propDefId: COMPONENT_SET_VARIANT_DEF_ID, value: "Default" }],
  } as FigDesignNode;
  const hoverVariant = {
    ...makeRectNode({ id: "30:3", x: 114, y: 18, width: 90, height: 48 }),
    type: "COMPONENT",
    name: "Secondary",
    fills: [{ type: "SOLID", color: { r: 0.9, g: 0.82, b: 1, a: 1 }, opacity: 1, visible: true }],
    variantPropSpecs: [{ propDefId: COMPONENT_SET_VARIANT_DEF_ID, value: "Hover" }],
  } as FigDesignNode;
  return {
    id: COMPONENT_SET_ID,
    type: "COMPONENT_SET",
    name: "Button Variant Set",
    visible: true,
    opacity: 1,
    transform: makeTransform(1120, 170),
    size: { x: 220, y: 90 },
    fills: [{ type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.98, a: 1 }, opacity: 1, visible: true }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    componentPropertyDefs: [{
      id: COMPONENT_SET_VARIANT_DEF_ID,
      name: "State",
      type: "VARIANT",
      initialValue: { referenceValue: "30:2" as FigNodeId },
    }],
    children: [defaultVariant, hoverVariant],
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
    makeTextNode({ id: "text-hello", x: 50, y: 50, width: 200, height: 30, text: "Hello World" }),
    makeTextNode({ id: "text-multi", x: 50, y: 120, width: 250, height: 80, text: "Line one\nLine two\nLine three", fontSize: 14 }),
    makeTextNode({ id: "text-empty", x: 50, y: 240, width: 200, height: 30, text: "" }),
    makeTextNode({ id: "text-wrapped", x: 260, y: 50, width: 60, height: 80, text: "Hello World", fontSize: 16 }),
    makeRectNode({ id: "rect-1", x: 50, y: 310, width: 150, height: 80 }),
    makeRectNode({ id: "ellipse-1", type: "ELLIPSE", x: 130, y: 330, width: 120, height: 80 }),
    makeRectNode({ id: "line-1", type: "LINE", x: 280, y: 455, width: 120, height: 40 }),
    makeVectorNode(),
    makeComponentInstanceNode(),
    makeSectionNode(),
    makeVariantComponentNode(),
    makeComponentSetNode(),
    makeNestedFrameNode(),
    makeCoveringGroupNode(),
    makeImageFillNode(),
  ],
};

const testDocument: FigDesignDocument = {
  pages: [testPage],
  components: new Map([
    [COMPONENT_ID, makeComponentSymbol()],
    [ICON_A_ID, makeIconComponent(ICON_A_ID, "Icon A", { type: "SOLID", color: { r: 0.1, g: 0.35, b: 1, a: 1 }, opacity: 1, visible: true })],
    [ICON_B_ID, makeIconComponent(ICON_B_ID, "Icon B", { type: "SOLID", color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true })],
  ]),
  images: new Map([[TEST_IMAGE_REF, TEST_IMAGE]]),
  blobs: [],
  styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
  metadata: null,
};

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function createFixtureImageBytes(): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create image fixture canvas context");
  }
  context.fillStyle = "#ff0000";
  context.fillRect(0, 0, 2, 2);
  return base64ToBytes(canvas.toDataURL("image/png").split(",")[1] ?? "");
}

// =============================================================================
// App — canvas only, no panels
// =============================================================================

const containerStyle: CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "grid",
  gridTemplateRows: "36px 1fr",
};

const editorBodyStyle = (panelMode: PanelMode): CSSProperties => ({
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: panelMode === "all" ? "260px 1fr 280px" : panelMode === "property" ? "1fr 280px" : "1fr",
});

const leftPanelStyle: CSSProperties = {
  minWidth: 0,
  overflow: "auto",
  borderRight: "1px solid #d9dee7",
  background: "#ffffff",
};

const propertyPanelStyle: CSSProperties = {
  minWidth: 0,
  overflow: "auto",
  borderLeft: "1px solid #d9dee7",
  background: "#ffffff",
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "4px 8px",
  borderBottom: "1px solid #d9dee7",
  background: "#ffffff",
};

function App() {
  const renderer = resolveRendererFromLocation(window.location);
  const panelMode = resolvePanelModeFromLocation(window.location);
  return (
    <FigEditorProvider initialDocument={testDocument}>
      <div style={containerStyle}>
        <div style={toolbarStyle}>
          <FigEditorToolbar />
        </div>
        <div style={editorBodyStyle(panelMode)}>
          {panelMode === "all" && (
            <aside aria-label="Pages and Layers" style={leftPanelStyle}>
              <PageListPanel />
              <LayerPanel />
            </aside>
          )}
          <FigEditorCanvas renderer={renderer} />
          {(panelMode === "property" || panelMode === "all") && (
            <aside aria-label="Properties" style={propertyPanelStyle}>
              <PropertyPanel />
            </aside>
          )}
        </div>
      </div>
    </FigEditorProvider>
  );
}

type PanelMode = "none" | "property" | "all";

function resolvePanelModeFromLocation(location: Location): PanelMode {
  const panel = new URLSearchParams(location.search).get("panel");
  if (panel === "property" || panel === "all") {
    return panel;
  }
  return "none";
}

function resolveRendererFromLocation(location: Location): FigEditorRendererKind {
  const renderer = new URLSearchParams(location.search).get("renderer");
  if (renderer === "svg" || renderer === "webgl") {
    return renderer;
  }
  return "svg";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
