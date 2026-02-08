/**
 * @file Presentation Editor Test
 *
 * Test component for the Phase 3 PresentationEditor with multi-slide support.
 * Includes slide thumbnails, slide editor, and property panels.
 */

import { useMemo, type CSSProperties } from "react";
import { PresentationEditor } from "@aurochs-ui/pptx-editor";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app";
import type { Slide, Presentation } from "@aurochs-office/pptx/domain";
import type { SpShape, GrpShape, GraphicFrame } from "@aurochs-office/pptx/domain/shape";
import type { Line } from "@aurochs-office/pptx/domain/color/types";
import type { Table, TableRow, TableCell } from "@aurochs-office/pptx/domain/table/types";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { ResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
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

type CreateSpShapeOptions = {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fillColor: string;
  readonly rotation?: number;
};

const createSpShape = ({ id, name, x, y, width, height, fillColor, rotation = 0 }: CreateSpShapeOptions): SpShape => {
  return {
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
  };
};

type CreateTextBoxOptions = {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
  readonly fontSize?: number;
};

const createTextBox = ({ id, name, x, y, width, height, text, fontSize = 14 }: CreateTextBoxOptions): SpShape => {
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
  };
};

type CreateTitleOptions = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
};

const createTitle = ({ id, x, y, width, height, text }: CreateTitleOptions): SpShape => {
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

const createTable = (headers: string[], rows: string[][]): Table => ({
  grid: { columns: headers.map(() => ({ width: px(100) })) },
  rows: [createTableRow(headers), ...rows.map((row) => createTableRow(row))],
  properties: {},
});

type CreateTableFrameOptions = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly headers: string[];
  readonly rows: string[][];
};

const createTableFrame = ({ id, x, y, headers, rows }: CreateTableFrameOptions): GraphicFrame => {
  return {
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
  };
};

type CreateGroupOptions = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly children: SpShape[];
};

const createGroup = ({ id, x, y, children }: CreateGroupOptions): GrpShape => {
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

// =============================================================================
// Test Slides
// =============================================================================

const createSlide1 = (): Slide => ({
  shapes: [
    createTitle({ id: "s1-title", x: 50, y: 30, width: 860, height: 60, text: "Welcome to Presentation Editor" }),
    createSpShape({ id: "s1-rect1", name: "Blue Box", x: 100, y: 150, width: 200, height: 150, fillColor: "3498DB" }),
    createSpShape({ id: "s1-rect2", name: "Green Box", x: 380, y: 150, width: 200, height: 150, fillColor: "2ECC71" }),
    createSpShape({ id: "s1-rect3", name: "Orange Box", x: 660, y: 150, width: 200, height: 150, fillColor: "E67E22" }),
    createTextBox({
      id: "s1-text1",
      name: "Description",
      x: 100,
      y: 350,
      width: 760,
      height: 100,
      text: "This is the first slide demonstrating various shape types and editing capabilities.",
      fontSize: 16,
    }),
  ],
});

const createSlide2 = (): Slide => ({
  shapes: [
    createTitle({ id: "s2-title", x: 50, y: 30, width: 860, height: 60, text: "Data Visualization" }),
    createTableFrame({
      id: "s2-table",
      x: 100,
      y: 120,
      headers: ["Product", "Q1", "Q2", "Q3", "Q4"],
      rows: [
        ["Widget A", "100", "150", "200", "180"],
        ["Widget B", "80", "120", "140", "160"],
        ["Widget C", "200", "180", "220", "250"],
      ],
    }),
    createSpShape({
      id: "s2-highlight",
      name: "Highlight",
      x: 600,
      y: 150,
      width: 260,
      height: 180,
      fillColor: "F1C40F",
      rotation: 5,
    }),
    createTextBox({
      id: "s2-note",
      name: "Note",
      x: 600,
      y: 350,
      width: 260,
      height: 80,
      text: "Sales data for 2024",
      fontSize: 14,
    }),
  ],
});

const createSlide3 = (): Slide => ({
  shapes: [
    createTitle({ id: "s3-title", x: 50, y: 30, width: 860, height: 60, text: "Grouped Elements" }),
    createGroup({
      id: "s3-group1",
      x: 100,
      y: 150,
      children: [
        createSpShape({ id: "s3-g1-1", name: "Circle 1", x: 0, y: 0, width: 80, height: 80, fillColor: "9B59B6" }),
        createSpShape({ id: "s3-g1-2", name: "Circle 2", x: 100, y: 0, width: 80, height: 80, fillColor: "8E44AD" }),
        createSpShape({ id: "s3-g1-3", name: "Circle 3", x: 50, y: 90, width: 80, height: 80, fillColor: "6C3483" }),
      ],
    }),
    createGroup({
      id: "s3-group2",
      x: 400,
      y: 150,
      children: [
        createSpShape({ id: "s3-g2-1", name: "Square 1", x: 0, y: 0, width: 60, height: 60, fillColor: "E74C3C" }),
        createSpShape({ id: "s3-g2-2", name: "Square 2", x: 80, y: 0, width: 60, height: 60, fillColor: "C0392B" }),
        createSpShape({ id: "s3-g2-3", name: "Square 3", x: 160, y: 0, width: 60, height: 60, fillColor: "A93226" }),
      ],
    }),
    createTextBox({
      id: "s3-instructions",
      name: "Instructions",
      x: 100,
      y: 350,
      width: 760,
      height: 80,
      text: "Select a group and use Ctrl+Shift+G to ungroup. Select multiple shapes and use Ctrl+G to group.",
      fontSize: 14,
    }),
  ],
});

const createSlide4 = (): Slide => ({
  shapes: [
    createTitle({ id: "s4-title", x: 50, y: 30, width: 860, height: 60, text: "Alignment & Distribution" }),
    createSpShape({ id: "s4-r1", name: "Rect 1", x: 100, y: 150, width: 100, height: 60, fillColor: "1ABC9C" }),
    createSpShape({ id: "s4-r2", name: "Rect 2", x: 250, y: 180, width: 80, height: 80, fillColor: "16A085" }),
    createSpShape({ id: "s4-r3", name: "Rect 3", x: 380, y: 160, width: 120, height: 50, fillColor: "148F77" }),
    createSpShape({ id: "s4-r4", name: "Rect 4", x: 550, y: 140, width: 90, height: 100, fillColor: "117A65" }),
    createSpShape({ id: "s4-r5", name: "Rect 5", x: 700, y: 170, width: 110, height: 70, fillColor: "0E6655" }),
    createTextBox({
      id: "s4-hint",
      name: "Hint",
      x: 100,
      y: 300,
      width: 760,
      height: 120,
      text: "Select multiple shapes and right-click to access alignment options:\n- Align Left/Center/Right\n- Align Top/Middle/Bottom\n- Distribute Horizontally/Vertically",
      fontSize: 13,
    }),
  ],
});

const createSlide5 = (): Slide => ({
  shapes: [
    createTitle({ id: "s5-title", x: 50, y: 30, width: 860, height: 60, text: "Rotated Shapes" }),
    createSpShape({
      id: "s5-r1",
      name: "Rotated 15",
      x: 100,
      y: 150,
      width: 120,
      height: 80,
      fillColor: "3498DB",
      rotation: 15,
    }),
    createSpShape({
      id: "s5-r2",
      name: "Rotated 30",
      x: 280,
      y: 150,
      width: 120,
      height: 80,
      fillColor: "2ECC71",
      rotation: 30,
    }),
    createSpShape({
      id: "s5-r3",
      name: "Rotated 45",
      x: 460,
      y: 150,
      width: 120,
      height: 80,
      fillColor: "E74C3C",
      rotation: 45,
    }),
    createSpShape({
      id: "s5-r4",
      name: "Rotated -20",
      x: 640,
      y: 150,
      width: 120,
      height: 80,
      fillColor: "9B59B6",
      rotation: -20,
    }),
    createTextBox({
      id: "s5-hint",
      name: "Rotation Hint",
      x: 100,
      y: 320,
      width: 760,
      height: 80,
      text: "Use the rotation handle (circle above shape) to rotate. Hold Shift for 15-degree increments.",
      fontSize: 14,
    }),
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
  getTarget: () => undefined,
  getType: () => undefined,
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

function ShortcutItem({ keys, description }: { keys: string; description: string }) {
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
          Full presentation editor with slide thumbnails, slide canvas, property panels, and layer panel. Click
          thumbnails to switch slides. Select and edit shapes on the canvas.
        </p>
      </div>

      {/* Editor */}
      <div style={editorContainerStyle}>
        <PresentationEditor initialDocument={initialDocument} showPropertyPanel showLayerPanel showToolbar />
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
