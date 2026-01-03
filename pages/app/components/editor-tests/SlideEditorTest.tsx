/**
 * @file Slide Editor Test
 *
 * Test component for the Phase 2 SlideEditor with interactive canvas.
 * Includes all shape types: SpShape, PicShape, CxnShape, GrpShape, GraphicFrame (table).
 */

import { useState, useMemo, type CSSProperties } from "react";
import { SlideEditor, getShapeTransform } from "@lib/pptx-editor";
import type { Slide } from "@lib/pptx/domain/slide";
import type {
  SpShape,
  CxnShape,
  GrpShape,
  GraphicFrame,
  Shape,
} from "@lib/pptx/domain/shape";
import type { Table, TableRow, TableCell } from "@lib/pptx/domain/table";
import { px, deg } from "@lib/pptx/domain/types";
import { createRenderContext } from "@lib/pptx/render/context";

// =============================================================================
// SpShape Fixture
// =============================================================================

const createTestSpShape = (
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
  nonVisual: {
    id,
    name,
    description: `Test shape: ${name}`,
  },
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
      color: {
        spec: {
          type: "srgb",
          value: fillColor,
        },
      },
    },
    line: {
      width: px(2),
      fill: {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "333333",
          },
        },
      },
    },
    geometry: {
      type: "preset",
      preset: "rect",
      adjustValues: [],
    },
  },
});

// =============================================================================
// TextBox Fixture
// =============================================================================

const createTestTextBox = (
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
  nonVisual: {
    id,
    name,
    textBox: true,
  },
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
      color: {
        spec: {
          type: "srgb",
          value: "FFFFFF",
        },
      },
    },
    line: {
      width: px(1),
      fill: {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "888888",
          },
        },
      },
    },
    geometry: {
      type: "preset",
      preset: "rect",
      adjustValues: [],
    },
  },
  textBody: {
    bodyProperties: {
      anchor: "t",
    },
    paragraphs: [
      {
        runs: [
          {
            type: "text",
            text,
            properties: {
              fontSize: px(fontSize),
            },
          },
        ],
        properties: {},
        endProperties: {},
      },
    ],
  },
});

// =============================================================================
// Title/Heading Fixture
// =============================================================================

const createTestTitle = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string
): SpShape => ({
  type: "sp",
  nonVisual: {
    id,
    name,
  },
  placeholder: {
    type: "title",
    idx: 0,
  },
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
    geometry: {
      type: "preset",
      preset: "rect",
      adjustValues: [],
    },
  },
  textBody: {
    bodyProperties: {
      anchor: "ctr",
    },
    paragraphs: [
      {
        runs: [
          {
            type: "text",
            text,
            properties: {
              fontSize: px(28),
              bold: true,
            },
          },
        ],
        properties: {},
        endProperties: {},
      },
    ],
  },
});

// =============================================================================
// GrpShape Fixture (Group)
// =============================================================================

const createTestGroup = (
  id: string,
  name: string,
  x: number,
  y: number,
  children: SpShape[]
): GrpShape => {
  // Calculate bounds from children
  const minX = Math.min(...children.map((c) => c.properties.transform?.x as number || 0));
  const minY = Math.min(...children.map((c) => c.properties.transform?.y as number || 0));
  const maxX = Math.max(...children.map((c) => (c.properties.transform?.x as number || 0) + (c.properties.transform?.width as number || 0)));
  const maxY = Math.max(...children.map((c) => (c.properties.transform?.y as number || 0) + (c.properties.transform?.height as number || 0)));
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    type: "grpSp",
    nonVisual: {
      id,
      name,
    },
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
// CxnShape Fixture (Connector)
// =============================================================================

const createTestCxnShape = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number
): CxnShape => ({
  type: "cxnSp",
  nonVisual: {
    id,
    name,
  },
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
    geometry: {
      type: "preset",
      preset: "line",
      adjustValues: [],
    },
    line: {
      width: px(2),
      fill: {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "000000",
          },
        },
      },
    },
  },
});

// =============================================================================
// GraphicFrame (Table) Fixture
// =============================================================================

const createTestTableCell = (text: string): TableCell => ({
  textBody: {
    bodyProperties: {},
    paragraphs: [
      {
        runs: [
          {
            type: "text",
            text,
            properties: {},
          },
        ],
        properties: {},
        endProperties: {},
      },
    ],
  },
  properties: {},
});

const createTestTableRow = (cells: string[]): TableRow => ({
  height: px(30),
  cells: cells.map(createTestTableCell),
});

const createTestTable = (): Table => ({
  grid: {
    columns: [{ width: px(80) }, { width: px(80) }, { width: px(80) }],
  },
  rows: [
    createTestTableRow(["Header 1", "Header 2", "Header 3"]),
    createTestTableRow(["A1", "B1", "C1"]),
    createTestTableRow(["A2", "B2", "C2"]),
  ],
  properties: {},
});

const createTestTableFrame = (
  id: string,
  name: string,
  x: number,
  y: number
): GraphicFrame => ({
  type: "graphicFrame",
  nonVisual: {
    id,
    name,
  },
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
    data: {
      table: createTestTable(),
    },
  },
});

// =============================================================================
// Test Slide with Multiple Shape Types
// =============================================================================

const createTestSlide = (): Slide => ({
  shapes: [
    // Title (placeholder)
    createTestTitle("title1", "Slide Title", 50, 10, 400, 40, "Slide Editor Test"),

    // SpShapes (auto shapes)
    createTestSpShape("sp1", "Blue Rectangle", 50, 70, 150, 80, "4A90D9"),
    createTestSpShape("sp2", "Red Rectangle", 220, 70, 120, 90, "D94A4A"),
    createTestSpShape("sp3", "Rotated Rectangle", 360, 70, 160, 70, "4AD97A", 15),

    // TextBoxes
    createTestTextBox("txt1", "TextBox 1", 540, 70, 180, 50, "This is a text box with some content.", 12),
    createTestTextBox("txt2", "TextBox 2", 540, 140, 180, 40, "Another text box here.", 11),

    // CxnShape (connector line)
    createTestCxnShape("cxn1", "Connector", 740, 90, 100),

    // GraphicFrame (table)
    createTestTableFrame("tbl1", "Sample Table", 50, 200),

    // Group with children
    createTestGroup(
      "grp1",
      "Grouped Shapes",
      350,
      200,
      [
        createTestSpShape("grp1-child1", "Group Child 1", 0, 0, 80, 60, "9B59B6"),
        createTestSpShape("grp1-child2", "Group Child 2", 100, 0, 80, 60, "3498DB"),
        createTestSpShape("grp1-child3", "Group Child 3", 50, 70, 80, 60, "E74C3C"),
      ]
    ),

    // Additional shapes for variety
    createTestSpShape("sp4", "Yellow Shape", 50, 360, 140, 100, "F1C40F"),
    createTestSpShape("sp5", "Purple Shape", 220, 380, 120, 80, "8E44AD", -10),
    createTestTextBox("txt3", "Description", 360, 360, 200, 80, "This text box demonstrates multi-line text wrapping for longer content.", 10),

    // Another table
    createTestTableFrame("tbl2", "Data Table", 600, 340),
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
  height: "600px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
  padding: "16px",
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

function ShortcutItem({ keys, description }: { keys: string; description: string }) {
  return (
    <div style={shortcutItemStyle}>
      <span style={{ color: "var(--text-secondary)" }}>{description}</span>
      <kbd style={kbdStyle}>{keys}</kbd>
    </div>
  );
}

/**
 * Slide editor test component
 */
export function SlideEditorTest() {
  const [slide, setSlide] = useState<Slide>(createTestSlide);

  // Create render context for integrated SVG rendering
  const renderContext = useMemo(() => createRenderContext({
    slideSize: {
      width: px(960),
      height: px(540),
    },
  }), []);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>Slide Editor (Phase 2)</h2>
        <p style={descriptionStyle}>
          Interactive slide editor with shape selection, drag-to-move, resize, rotate,
          and property editing. Click shapes to select, drag to move, use handles to
          resize or rotate.
        </p>
      </div>

      {/* Editor */}
      <div style={editorContainerStyle}>
        <SlideEditor
          value={slide}
          onChange={setSlide}
          width={px(960)}
          height={px(540)}
          renderContext={renderContext}
          showPropertyPanel
          showToolbar
          propertyPanelPosition="right"
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
            <ShortcutItem keys="Ctrl+X" description="Cut" />
            <ShortcutItem keys="Ctrl+Z" description="Undo" />
            <ShortcutItem keys="Ctrl+Y" description="Redo" />
            <ShortcutItem keys="Ctrl+A" description="Select all" />
            <ShortcutItem keys="Ctrl+D" description="Duplicate" />
            <ShortcutItem keys="Arrow" description="Nudge (1px)" />
            <ShortcutItem keys="Shift+Arrow" description="Nudge (10px)" />
            <ShortcutItem keys="Escape" description="Clear selection" />
          </div>
        </div>

        {/* Current State */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Current Slide State</h3>
          <div style={valueDisplayStyle}>
            {JSON.stringify(
              {
                shapeCount: slide.shapes.length,
                shapes: slide.shapes.map((s: Shape) => ({
                  id: "nonVisual" in s ? s.nonVisual.id : undefined,
                  name: "nonVisual" in s ? s.nonVisual.name : undefined,
                  type: s.type,
                  transform: getShapeTransform(s),
                })),
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
