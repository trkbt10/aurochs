/**
 * @file Slide Canvas Test
 *
 * Test component for the SlideCanvas with interactive selection.
 * Uses the pure canvas component with external state management.
 */

import { useReducer, useMemo, useCallback, useRef, useEffect, type CSSProperties } from "react";
import { Panel } from "@aurochs-ui/ui-components/layout";
import {
  SlideCanvas,
  slideEditorReducer,
  createSlideEditorState,
  findShapeById,
  PropertyPanel,
  clientToSlideCoords,
  withUpdatedTransform,
} from "@aurochs-ui/pptx-editor";
import type { ResizeHandlePosition } from "@aurochs-ui/pptx-editor";
import type { Slide, Shape } from "@aurochs-office/pptx/domain";
import type { SpShape, GrpShape, GraphicFrame, CxnShape } from "@aurochs-office/pptx/domain/shape";
import type { Line } from "@aurochs-office/pptx/domain/color/types";
import type { Table, TableRow, TableCell } from "@aurochs-office/pptx/domain/table/types";
import type { ShapeId } from "@aurochs-office/pptx/domain";
import { px, deg, pt } from "@aurochs-office/drawing-ml/domain/units";

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

const createSpShape = (args: {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fillColor: string;
  readonly rotation?: number;
}): SpShape => {
  const { id, name, x, y, width, height, fillColor, rotation = 0 } = args;
  return {
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
  };
};

const createTextBox = (args: {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
  readonly fontSize?: number;
}): SpShape => {
  const { id, name, x, y, width, height, text, fontSize = 14 } = args;
  return {
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
  };
};

const createTitle = (args: {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
}): SpShape => {
  const { id, x, y, width, height, text } = args;
  return {
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
          runs: [{ type: "text", text, properties: { fontSize: pt(28), bold: true } }],
          properties: {},
          endProperties: {},
        },
      ],
    },
  };
};

const createGroup = (args: {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly children: SpShape[];
}): GrpShape => {
  const { id, x, y, children } = args;
  const minX = Math.min(...children.map((c) => (c.properties.transform?.x as number) || 0));
  const minY = Math.min(...children.map((c) => (c.properties.transform?.y as number) || 0));
  const maxX = Math.max(
    ...children.map(
      (c) => ((c.properties.transform?.x as number) || 0) + ((c.properties.transform?.width as number) || 0),
    ),
  );
  const maxY = Math.max(
    ...children.map(
      (c) => ((c.properties.transform?.y as number) || 0) + ((c.properties.transform?.height as number) || 0),
    ),
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

const createCxnShape = (args: {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}): CxnShape => {
  const { id, x, y, width } = args;
  return {
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
  };
};

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

const createTableFrame = (id: string, x: number, y: number): GraphicFrame => ({
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
    createTitle({ id: "title1", x: 50, y: 10, width: 400, height: 40, text: "Slide Canvas Test" }),
    createSpShape({ id: "sp1", name: "Blue Rectangle", x: 50, y: 70, width: 150, height: 80, fillColor: "4A90D9" }),
    createSpShape({ id: "sp2", name: "Red Rectangle", x: 220, y: 70, width: 120, height: 90, fillColor: "D94A4A" }),
    createSpShape({
      id: "sp3",
      name: "Rotated Rectangle",
      x: 360,
      y: 70,
      width: 160,
      height: 70,
      fillColor: "4AD97A",
      rotation: 15,
    }),
    createTextBox({
      id: "txt1",
      name: "TextBox 1",
      x: 540,
      y: 70,
      width: 180,
      height: 50,
      text: "This is a text box with some content.",
      fontSize: 12,
    }),
    createTextBox({
      id: "txt2",
      name: "TextBox 2",
      x: 540,
      y: 140,
      width: 180,
      height: 40,
      text: "Another text box.",
      fontSize: 11,
    }),
    createCxnShape({ id: "cxn1", x: 740, y: 90, width: 100 }),
    createTableFrame("tbl1", 50, 200),
    createGroup({
      id: "grp1",
      x: 350,
      y: 200,
      children: [
        createSpShape({ id: "grp1-child1", name: "Child 1", x: 0, y: 0, width: 80, height: 60, fillColor: "9B59B6" }),
        createSpShape({ id: "grp1-child2", name: "Child 2", x: 100, y: 0, width: 80, height: 60, fillColor: "3498DB" }),
        createSpShape({ id: "grp1-child3", name: "Child 3", x: 50, y: 70, width: 80, height: 60, fillColor: "E74C3C" }),
      ],
    }),
    createSpShape({ id: "sp4", name: "Yellow Shape", x: 50, y: 360, width: 140, height: 100, fillColor: "F1C40F" }),
    createSpShape({
      id: "sp5",
      name: "Purple Shape",
      x: 220,
      y: 380,
      width: 120,
      height: 80,
      fillColor: "8E44AD",
      rotation: -10,
    }),
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

  const initialState = useMemo(() => createSlideEditorState(createTestSlide()), []);

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
      const coords = clientToSlideCoords({
        clientX: e.clientX,
        clientY: e.clientY,
        containerRect: rect,
        slideWidth: SLIDE_WIDTH,
        slideHeight: SLIDE_HEIGHT,
      });

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

  const handleSelect = useCallback((shapeId: ShapeId, addToSelection: boolean, _toggle?: boolean) => {
    dispatch({ type: "SELECT", shapeId, addToSelection });
  }, []);

  const handleSelectMultiple = useCallback((shapeIds: readonly ShapeId[]) => {
    dispatch({ type: "SELECT_MULTIPLE", shapeIds });
  }, []);

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const handleStartMove = useCallback((startX: number, startY: number) => {
    dispatch({ type: "START_MOVE", startX: px(startX), startY: px(startY) });
  }, []);

  const handleStartResize = useCallback(
    ({
      handle,
      startX,
      startY,
      aspectLocked,
    }: {
      handle: ResizeHandlePosition;
      startX: number;
      startY: number;
      aspectLocked: boolean;
    }) => {
      dispatch({ type: "START_RESIZE", handle, startX: px(startX), startY: px(startY), aspectLocked });
    },
    [],
  );

  const handleStartRotate = useCallback((startX: number, startY: number) => {
    dispatch({ type: "START_ROTATE", startX: px(startX), startY: px(startY) });
  }, []);

  const handleShapeChange = useCallback((shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
    dispatch({ type: "UPDATE_SHAPE", shapeId, updater });
  }, []);

  const handleSlideChange = useCallback((updater: (slide: Slide) => Slide) => {
    dispatch({ type: "UPDATE_SLIDE", updater });
  }, []);

  const handleUngroup = useCallback((shapeId: ShapeId) => {
    dispatch({ type: "UNGROUP_SHAPE", shapeId });
  }, []);

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
    [selection.selectedIds, primaryShape],
  );

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>Slide Canvas (Pure Component)</h2>
        <p style={descriptionStyle}>
          Pure SlideCanvas component with external state management. This demonstrates the controlled component API
          where all state is managed outside the canvas. Click to select shapes, drag to move them.
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
              width={width}
              height={height}
              primaryShape={primaryShape}
              selectedShapes={selectedShapes}
              contextMenuActions={contextMenuActions}
              onSelect={handleSelect}
              onSelectMultiple={handleSelectMultiple}
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
              layoutOptions={[]}
              selectedShapes={selectedShapes}
              primaryShape={primaryShape}
              onShapeChange={handleShapeChange}
              onSlideChange={handleSlideChange}
              onUngroup={handleUngroup}
              onSelect={handleSelect}
              onLayoutAttributesChange={() => {}}
              onLayoutChange={() => {}}
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
              2,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
