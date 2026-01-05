/**
 * @file Slide Canvas Test
 *
 * Test component for the SlideCanvas with interactive selection.
 * Uses the pure canvas component with external state management.
 */

import { useReducer, useMemo, useCallback, useRef, useEffect, type CSSProperties } from "react";
import {
  SlideCanvas,
  slideEditorReducer,
  createSlideEditorState,
  findShapeById,
  PropertyPanel,
  clientToSlideCoords,
  withUpdatedTransform,
  Panel,
} from "@lib/pptx-editor";
import type { ResizeHandlePosition } from "@lib/pptx-editor";
import type { Slide, Shape } from "@lib/pptx/domain";
import type { SpShape, GrpShape, GraphicFrame, CxnShape } from "@lib/pptx/domain/shape";
import type { Line } from "@lib/pptx/domain/color";
import type { Table, TableRow, TableCell } from "@lib/pptx/domain/table";
import type { ShapeId } from "@lib/pptx/domain/types";
import { px, deg, pt } from "@lib/pptx/domain/types";
import { createRenderContext } from "@lib/pptx/render/context";
import { renderSlideSvg } from "@lib/pptx/render/svg/renderer";

// =============================================================================
// Fixture Helpers
// =============================================================================

function createLine(color: string, widthVal = 2): Line {
  return {
    width: px(widthVal),
    cap: "flat",
    compound: "sng",
    alignment: "ctr",
    fill: {
      type: "solidFill",
      color: { spec: { type: "srgb", value: color } },
    },
    dash: "solid",
    join: "round",
  };
}

const createSpShape = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  rotation = 0
): SpShape => ({
  type: "sp",
  nonVisual: { id, name, description: `Test shape: ${name}` },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      rotation: deg(rotation),
      flipH: false,
      flipV: false,
    },
    fill: {
      type: "solidFill",
      color: { spec: { type: "srgb", value: fillColor } },
    },
    line: createLine("333333", 2),
    geometry: { type: "preset", preset: "rect", adjustValues: [] },
  },
});

const createTextBox = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  fontSize = 14
): SpShape => ({
  type: "sp",
  nonVisual: { id, name, textBox: true },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    fill: {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FFFFFF" } },
    },
    line: createLine("888888", 1),
    geometry: { type: "preset", preset: "rect", adjustValues: [] },
  },
  textBody: {
    bodyProperties: { anchor: "top" },
    paragraphs: [
      {
        runs: [{ type: "text", text, properties: { fontSize: pt(fontSize) } }],
        properties: {},
        endProperties: {},
      },
    ],
  },
});

const createTitle = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string
): SpShape => ({
  type: "sp",
  nonVisual: { id, name: "Title" },
  placeholder: { type: "title", idx: 0 },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    geometry: { type: "preset", preset: "rect", adjustValues: [] },
  },
  textBody: {
    bodyProperties: { anchor: "center" },
    paragraphs: [
      {
        runs: [
          { type: "text", text, properties: { fontSize: pt(28), bold: true } },
        ],
        properties: {},
        endProperties: {},
      },
    ],
  },
});

const createGroup = (
  id: string,
  x: number,
  y: number,
  children: SpShape[]
): GrpShape => {
  const minX = Math.min(
    ...children.map((c) => (c.properties.transform?.x as number) || 0)
  );
  const minY = Math.min(
    ...children.map((c) => (c.properties.transform?.y as number) || 0)
  );
  const maxX = Math.max(
    ...children.map(
      (c) =>
        ((c.properties.transform?.x as number) || 0) +
        ((c.properties.transform?.width as number) || 0)
    )
  );
  const maxY = Math.max(
    ...children.map(
      (c) =>
        ((c.properties.transform?.y as number) || 0) +
        ((c.properties.transform?.height as number) || 0)
    )
  );
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    type: "grpSp",
    nonVisual: { id, name: "Group" },
    properties: {
      transform: {
        x: px(x),
        y: px(y),
        width: px(width),
        height: px(height),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(minX),
        childOffsetY: px(minY),
        childExtentWidth: px(width),
        childExtentHeight: px(height),
      },
    },
    children,
  };
};

const createCxnShape = (
  id: string,
  x: number,
  y: number,
  width: number
): CxnShape => ({
  type: "cxnSp",
  nonVisual: { id, name: "Connector" },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(0),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    geometry: { type: "preset", preset: "line", adjustValues: [] },
    line: createLine("000000", 2),
  },
});

const createTableCell = (text: string): TableCell => ({
  textBody: {
    bodyProperties: {},
    paragraphs: [
      {
        runs: [{ type: "text", text, properties: {} }],
        properties: {},
        endProperties: {},
      },
    ],
  },
  properties: {},
});

const createTableRow = (cells: string[]): TableRow => ({
  height: px(30),
  cells: cells.map(createTableCell),
});

const createTable = (): Table => ({
  grid: {
    columns: [{ width: px(80) }, { width: px(80) }, { width: px(80) }],
  },
  rows: [
    createTableRow(["Header 1", "Header 2", "Header 3"]),
    createTableRow(["A1", "B1", "C1"]),
    createTableRow(["A2", "B2", "C2"]),
  ],
  properties: {},
});

const createTableFrame = (
  id: string,
  x: number,
  y: number
): GraphicFrame => ({
  type: "graphicFrame",
  nonVisual: { id, name: "Table" },
  transform: {
    x: px(x),
    y: px(y),
    width: px(240),
    height: px(120),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  },
  content: {
    type: "table",
    data: { table: createTable() },
  },
});

// =============================================================================
// Test Slide
// =============================================================================

const createTestSlide = (): Slide => ({
  shapes: [
    createTitle("title1", 50, 10, 400, 40, "Slide Canvas Test"),
    createSpShape("sp1", "Blue Rectangle", 50, 70, 150, 80, "4A90D9"),
    createSpShape("sp2", "Red Rectangle", 220, 70, 120, 90, "D94A4A"),
    createSpShape("sp3", "Rotated Rectangle", 360, 70, 160, 70, "4AD97A", 15),
    createTextBox(
      "txt1",
      "TextBox 1",
      540,
      70,
      180,
      50,
      "This is a text box with some content.",
      12
    ),
    createTextBox("txt2", "TextBox 2", 540, 140, 180, 40, "Another text box.", 11),
    createCxnShape("cxn1", 740, 90, 100),
    createTableFrame("tbl1", 50, 200),
    createGroup("grp1", 350, 200, [
      createSpShape("grp1-child1", "Child 1", 0, 0, 80, 60, "9B59B6"),
      createSpShape("grp1-child2", "Child 2", 100, 0, 80, 60, "3498DB"),
      createSpShape("grp1-child3", "Child 3", 50, 70, 80, 60, "E74C3C"),
    ]),
    createSpShape("sp4", "Yellow Shape", 50, 360, 140, 100, "F1C40F"),
    createSpShape("sp5", "Purple Shape", 220, 380, 120, 80, "8E44AD", -10),
  ],
});

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const headerStyle: CSSProperties = {
  padding: "16px 20px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
};

const titleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "8px",
};

const descriptionStyle: CSSProperties = {
  fontSize: "14px",
  color: "var(--text-secondary)",
  lineHeight: 1.5,
};

const editorContainerStyle: CSSProperties = {
  display: "flex",
  gap: "16px",
  height: "500px",
};

const canvasWrapperStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
  padding: "24px",
  overflow: "hidden",
};

const canvasSizeStyle: CSSProperties = {
  width: "100%",
  maxWidth: "800px",
  aspectRatio: "16 / 9",
  backgroundColor: "white",
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
};

const propertyPanelStyle: CSSProperties = {
  width: "280px",
  flexShrink: 0,
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
  overflow: "auto",
};

const infoStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const infoPanelStyle: CSSProperties = {
  padding: "16px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
};

const infoTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "12px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const shortcutListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "13px",
};

const valueDisplayStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "8px",
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-tertiary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "200px",
  overflow: "auto",
};

// =============================================================================
// Components
// =============================================================================

const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;

/**
 * Slide canvas test component using the pure SlideCanvas with external state
 */
export function SlideEditorTest() {
  const containerRef = useRef<HTMLDivElement>(null);

  const initialState = useMemo(
    () => createSlideEditorState(createTestSlide()),
    []
  );

  const [state, dispatch] = useReducer(slideEditorReducer, initialState);

  const slide = state.slideHistory.present;
  const { selection, drag } = state;
  const width = px(SLIDE_WIDTH);
  const height = px(SLIDE_HEIGHT);

  const selectedShapes = useMemo(() => {
    return selection.selectedIds
      .map((id) => findShapeById(slide.shapes, id))
      .filter((s): s is Shape => s !== undefined);
  }, [slide.shapes, selection.selectedIds]);

  const primaryShape = useMemo(() => {
    if (!selection.primaryId) {
      return undefined;
    }
    return findShapeById(slide.shapes, selection.primaryId);
  }, [slide.shapes, selection.primaryId]);

  // Render context for SVG
  const renderContext = useMemo(
    () => createRenderContext({ slideSize: { width, height } }),
    [width, height]
  );

  // Rendered SVG content
  const svgContent = useMemo(() => {
    const result = renderSlideSvg(slide, renderContext);
    return result.svg;
  }, [slide, renderContext]);

  // ==========================================================================
  // Drag handlers
  // ==========================================================================

  useEffect(() => {
    if (drag.type === "idle") {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, SLIDE_WIDTH, SLIDE_HEIGHT);

      if (drag.type === "move") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);

        for (const shapeId of drag.shapeIds) {
          const initialBounds = drag.initialBounds.get(shapeId);
          if (!initialBounds) {
            continue;
          }

          dispatch({
            type: "UPDATE_SHAPE",
            shapeId,
            updater: (shape) =>
              withUpdatedTransform(shape, {
                x: px(initialBounds.x + deltaX),
                y: px(initialBounds.y + deltaY),
              }),
          });
        }
      }
    };

    const handlePointerUp = () => {
      dispatch({ type: "END_DRAG" });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag]);

  // ==========================================================================
  // Callbacks
  // ==========================================================================

  const handleSelect = useCallback(
    (shapeId: ShapeId, addToSelection: boolean) => {
      dispatch({ type: "SELECT", shapeId, addToSelection });
    },
    []
  );

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const handleStartMove = useCallback(
    (startX: number, startY: number) => {
      dispatch({ type: "START_MOVE", startX: px(startX), startY: px(startY) });
    },
    []
  );

  const handleStartResize = useCallback(
    (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => {
      dispatch({ type: "START_RESIZE", handle, startX: px(startX), startY: px(startY), aspectLocked });
    },
    []
  );

  const handleStartRotate = useCallback(
    (startX: number, startY: number) => {
      dispatch({ type: "START_ROTATE", startX: px(startX), startY: px(startY) });
    },
    []
  );

  const handleShapeChange = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
      dispatch({ type: "UPDATE_SHAPE", shapeId, updater });
    },
    []
  );

  const handleSlideChange = useCallback(
    (updater: (slide: Slide) => Slide) => {
      dispatch({ type: "UPDATE_SLIDE", updater });
    },
    []
  );

  const handleUngroup = useCallback(
    (shapeId: ShapeId) => {
      dispatch({ type: "UNGROUP_SHAPE", shapeId });
    },
    []
  );

  // Context menu actions (minimal for this test)
  const contextMenuActions = useMemo(
    () => ({
      hasSelection: selection.selectedIds.length > 0,
      hasClipboard: false,
      isMultiSelect: selection.selectedIds.length > 1,
      canGroup: selection.selectedIds.length >= 2,
      canUngroup: selection.selectedIds.length === 1 && primaryShape?.type === "grpSp",
      canAlign: selection.selectedIds.length >= 2,
      canDistribute: selection.selectedIds.length >= 3,
      copy: () => dispatch({ type: "COPY" }),
      cut: () => {},
      paste: () => dispatch({ type: "PASTE" }),
      duplicateSelected: () => {},
      deleteSelected: () => dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds }),
      bringToFront: () => {},
      bringForward: () => {},
      sendBackward: () => {},
      sendToBack: () => {},
      group: () => {},
      ungroup: () => {},
      alignLeft: () => {},
      alignCenter: () => {},
      alignRight: () => {},
      alignTop: () => {},
      alignMiddle: () => {},
      alignBottom: () => {},
      distributeHorizontally: () => {},
      distributeVertically: () => {},
    }),
    [selection.selectedIds, primaryShape]
  );

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>Slide Canvas (Pure Component)</h2>
        <p style={descriptionStyle}>
          Pure SlideCanvas component with external state management. This demonstrates
          the controlled component API where all state is managed outside the canvas.
          Click to select shapes, drag to move them.
        </p>
      </div>

      {/* Editor */}
      <div style={editorContainerStyle}>
        {/* Canvas */}
        <div style={canvasWrapperStyle}>
          <div ref={containerRef} style={canvasSizeStyle}>
            <SlideCanvas
              slide={slide}
              selection={selection}
              drag={drag}
              svgContent={svgContent}
              width={width}
              height={height}
              primaryShape={primaryShape}
              selectedShapes={selectedShapes}
              contextMenuActions={contextMenuActions}
              onSelect={handleSelect}
              onClearSelection={handleClearSelection}
              onStartMove={handleStartMove}
              onStartResize={handleStartResize}
              onStartRotate={handleStartRotate}
            />
          </div>
        </div>

        {/* Property Panel */}
        <div style={propertyPanelStyle}>
          <Panel title="Properties">
            <PropertyPanel
              slide={slide}
              selectedShapes={selectedShapes}
              primaryShape={primaryShape}
              onShapeChange={handleShapeChange}
              onSlideChange={handleSlideChange}
              onUngroup={handleUngroup}
              onSelect={(id) => handleSelect(id, false)}
            />
          </Panel>
        </div>
      </div>

      {/* Info Panels */}
      <div style={infoStyle}>
        {/* About */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>About SlideCanvas</h3>
          <div style={shortcutListStyle}>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6 }}>
              SlideCanvas is a pure view component that renders:
            </p>
            <ul style={{ color: "var(--text-secondary)", fontSize: "13px", marginLeft: "16px" }}>
              <li>Pre-rendered SVG content</li>
              <li>Shape hit areas for selection</li>
              <li>Selection boxes with handles</li>
              <li>Context menu support</li>
            </ul>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6, marginTop: "8px" }}>
              All state is passed in as props, making it fully controlled and testable.
            </p>
          </div>
        </div>

        {/* Current State */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Current State</h3>
          <div style={valueDisplayStyle}>
            {JSON.stringify(
              {
                shapeCount: slide.shapes.length,
                selectedIds: selection.selectedIds,
                primaryId: selection.primaryId,
                dragType: drag.type,
              },
              null,
              2
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
