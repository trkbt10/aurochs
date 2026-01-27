/**
 * @file Presentation Editor Test
 *
 * Test component for the Phase 3 PresentationEditor with multi-slide support.
 * Includes slide thumbnails, slide editor, and property panels.
 */

import { useMemo, type CSSProperties } from "react";
import { PresentationEditor } from "@oxen-ui/pptx-editor";
import type { PresentationDocument, SlideWithId } from "@oxen/pptx/app";
import type { Slide, Presentation } from "@oxen/pptx/domain";
import type { SpShape, GrpShape, GraphicFrame } from "@oxen/pptx/domain/shape";
import type { Line } from "@oxen/pptx/domain/color/types";
import type { Table, TableRow, TableCell } from "@oxen/pptx/domain/table/types";
import type { ColorContext } from "@oxen/pptx/domain/color/context";
import type { ResourceResolver } from "@oxen/pptx/domain/resource-resolver";
import { px, deg, pt } from "@oxen/ooxml/domain/units";

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
  nonVisual: { id, name },
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
    line: createLine("CCCCCC", 1),
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
          {
            type: "text",
            text,
            properties: { fontSize: pt(32), bold: true },
          },
        ],
        properties: {},
        endProperties: {},
      },
    ],
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

const createTable = (headers: string[], rows: string[][]): Table => ({
  grid: { columns: headers.map(() => ({ width: px(100) })) },
  rows: [
    createTableRow(headers),
    ...rows.map((row) => createTableRow(row)),
  ],
  properties: {},
});

const createTableFrame = (
  id: string,
  x: number,
  y: number,
  headers: string[],
  rows: string[][]
): GraphicFrame => ({
  type: "graphicFrame",
  nonVisual: { id, name: "Table" },
  transform: {
    x: px(x),
    y: px(y),
    width: px(headers.length * 100),
    height: px((rows.length + 1) * 30 + 10),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  },
  content: {
    type: "table",
    data: { table: createTable(headers, rows) },
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

// =============================================================================
// Test Slides
// =============================================================================

const createSlide1 = (): Slide => ({
  shapes: [
    createTitle("s1-title", 50, 30, 860, 60, "Welcome to Presentation Editor"),
    createSpShape("s1-rect1", "Blue Box", 100, 150, 200, 150, "3498DB"),
    createSpShape("s1-rect2", "Green Box", 380, 150, 200, 150, "2ECC71"),
    createSpShape("s1-rect3", "Orange Box", 660, 150, 200, 150, "E67E22"),
    createTextBox(
      "s1-text1",
      "Description",
      100,
      350,
      760,
      100,
      "This is the first slide demonstrating various shape types and editing capabilities.",
      16
    ),
  ],
});

const createSlide2 = (): Slide => ({
  shapes: [
    createTitle("s2-title", 50, 30, 860, 60, "Data Visualization"),
    createTableFrame(
      "s2-table",
      100,
      120,
      ["Product", "Q1", "Q2", "Q3", "Q4"],
      [
        ["Widget A", "100", "150", "200", "180"],
        ["Widget B", "80", "120", "140", "160"],
        ["Widget C", "200", "180", "220", "250"],
      ]
    ),
    createSpShape("s2-highlight", "Highlight", 600, 150, 260, 180, "F1C40F", 5),
    createTextBox(
      "s2-note",
      "Note",
      600,
      350,
      260,
      80,
      "Sales data for 2024",
      14
    ),
  ],
});

const createSlide3 = (): Slide => ({
  shapes: [
    createTitle("s3-title", 50, 30, 860, 60, "Grouped Elements"),
    createGroup("s3-group1", 100, 150, [
      createSpShape("s3-g1-1", "Circle 1", 0, 0, 80, 80, "9B59B6"),
      createSpShape("s3-g1-2", "Circle 2", 100, 0, 80, 80, "8E44AD"),
      createSpShape("s3-g1-3", "Circle 3", 50, 90, 80, 80, "6C3483"),
    ]),
    createGroup("s3-group2", 400, 150, [
      createSpShape("s3-g2-1", "Square 1", 0, 0, 60, 60, "E74C3C"),
      createSpShape("s3-g2-2", "Square 2", 80, 0, 60, 60, "C0392B"),
      createSpShape("s3-g2-3", "Square 3", 160, 0, 60, 60, "A93226"),
    ]),
    createTextBox(
      "s3-instructions",
      "Instructions",
      100,
      350,
      760,
      80,
      "Select a group and use Ctrl+Shift+G to ungroup. Select multiple shapes and use Ctrl+G to group.",
      14
    ),
  ],
});

const createSlide4 = (): Slide => ({
  shapes: [
    createTitle("s4-title", 50, 30, 860, 60, "Alignment & Distribution"),
    createSpShape("s4-r1", "Rect 1", 100, 150, 100, 60, "1ABC9C"),
    createSpShape("s4-r2", "Rect 2", 250, 180, 80, 80, "16A085"),
    createSpShape("s4-r3", "Rect 3", 380, 160, 120, 50, "148F77"),
    createSpShape("s4-r4", "Rect 4", 550, 140, 90, 100, "117A65"),
    createSpShape("s4-r5", "Rect 5", 700, 170, 110, 70, "0E6655"),
    createTextBox(
      "s4-hint",
      "Hint",
      100,
      300,
      760,
      120,
      "Select multiple shapes and right-click to access alignment options:\n- Align Left/Center/Right\n- Align Top/Middle/Bottom\n- Distribute Horizontally/Vertically",
      13
    ),
  ],
});

const createSlide5 = (): Slide => ({
  shapes: [
    createTitle("s5-title", 50, 30, 860, 60, "Rotated Shapes"),
    createSpShape("s5-r1", "Rotated 15", 100, 150, 120, 80, "3498DB", 15),
    createSpShape("s5-r2", "Rotated 30", 280, 150, 120, 80, "2ECC71", 30),
    createSpShape("s5-r3", "Rotated 45", 460, 150, 120, 80, "E74C3C", 45),
    createSpShape("s5-r4", "Rotated -20", 640, 150, 120, 80, "9B59B6", -20),
    createTextBox(
      "s5-hint",
      "Rotation Hint",
      100,
      320,
      760,
      80,
      "Use the rotation handle (circle above shape) to rotate. Hold Shift for 15-degree increments.",
      14
    ),
  ],
});

// =============================================================================
// Test Document
// =============================================================================

const SLIDE_WIDTH = 960;
const SLIDE_HEIGHT = 540;

/**
 * Empty resource resolver for test purposes
 */
const emptyResourceResolver: ResourceResolver = {
  resolve: () => undefined,
  getMimeType: () => undefined,
  getFilePath: () => undefined,
  readFile: () => null,
  getResourceByType: () => undefined,
};

/**
 * Default color context for test purposes
 */
const defaultColorContext: ColorContext = {
  colorScheme: {},
  colorMap: {},
};

const createTestDocument = (): PresentationDocument => {
  const slides: SlideWithId[] = [
    { id: "slide-1", slide: createSlide1() },
    { id: "slide-2", slide: createSlide2() },
    { id: "slide-3", slide: createSlide3() },
    { id: "slide-4", slide: createSlide4() },
    { id: "slide-5", slide: createSlide5() },
  ];

  const presentation: Presentation = {
    slideSize: {
      width: px(SLIDE_WIDTH),
      height: px(SLIDE_HEIGHT),
    },
  };

  return {
    presentation,
    slides,
    slideWidth: px(SLIDE_WIDTH),
    slideHeight: px(SLIDE_HEIGHT),
    colorContext: defaultColorContext,
    resources: emptyResourceResolver,
  };
};

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
  height: "700px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
  overflow: "hidden",
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

const shortcutItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const kbdStyle: CSSProperties = {
  padding: "2px 6px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "4px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  border: "1px solid var(--border-subtle)",
};

const featureListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "13px",
  color: "var(--text-secondary)",
};

// =============================================================================
// Components
// =============================================================================

function ShortcutItem({
  keys,
  description,
}: {
  keys: string;
  description: string;
}) {
  return (
    <div style={shortcutItemStyle}>
      <span style={{ color: "var(--text-secondary)" }}>{description}</span>
      <kbd style={kbdStyle}>{keys}</kbd>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ color: "var(--accent-green, #22c55e)" }}>✓</span>
      <span>{text}</span>
    </div>
  );
}

/**
 * Presentation editor test component
 */
export function PresentationEditorTest() {
  const initialDocument = useMemo(createTestDocument, []);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>Presentation Editor (Phase 3)</h2>
        <p style={descriptionStyle}>
          Full presentation editor with slide thumbnails, slide canvas, property
          panels, and layer panel. Click thumbnails to switch slides. Select and
          edit shapes on the canvas.
        </p>
      </div>

      {/* Editor */}
      <div style={editorContainerStyle}>
        <PresentationEditor
          initialDocument={initialDocument}
          showPropertyPanel
          showLayerPanel
          showToolbar
        />
      </div>

      {/* Info Panels */}
      <div style={infoStyle}>
        {/* Keyboard Shortcuts */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Keyboard Shortcuts</h3>
          <div style={shortcutListStyle}>
            <ShortcutItem keys="Delete" description="Delete selected" />
            <ShortcutItem keys="Ctrl+C" description="Copy" />
            <ShortcutItem keys="Ctrl+V" description="Paste" />
            <ShortcutItem keys="Ctrl+Z" description="Undo" />
            <ShortcutItem keys="Ctrl+Y" description="Redo" />
            <ShortcutItem keys="Ctrl+A" description="Select all" />
            <ShortcutItem keys="Ctrl+D" description="Duplicate" />
            <ShortcutItem keys="Ctrl+G" description="Group" />
            <ShortcutItem keys="Ctrl+Shift+G" description="Ungroup" />
            <ShortcutItem keys="Escape" description="Clear selection" />
          </div>
        </div>

        {/* Features */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Features</h3>
          <div style={featureListStyle}>
            <FeatureItem text="Multi-slide navigation with thumbnails" />
            <FeatureItem text="Shape selection (single and multi)" />
            <FeatureItem text="Drag to move shapes" />
            <FeatureItem text="Resize handles with aspect lock (Shift)" />
            <FeatureItem text="Rotation with snap (Shift for 15°)" />
            <FeatureItem text="Group / Ungroup shapes" />
            <FeatureItem text="Context menu with alignment options" />
            <FeatureItem text="Property panel for shape editing" />
            <FeatureItem text="Layer panel for z-order" />
            <FeatureItem text="Presentation-wide undo/redo" />
          </div>
        </div>
      </div>
    </div>
  );
}
