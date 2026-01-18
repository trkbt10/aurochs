/**
 * @file DOCX Editor Test Page
 *
 * Test page for visually verifying DOCX editor components.
 */

import { useState, useMemo, type CSSProperties } from "react";
import {
  RunPropertiesEditor,
  createDefaultRunProperties,
  ParagraphPropertiesEditor,
  createDefaultParagraphProperties,
  StyleEditor,
  createDefaultStyle,
  NumberingLevelEditor,
  createDefaultLevel,
  TablePropertiesEditor,
  createDefaultTableProperties,
  TableCellPropertiesEditor,
  createDefaultTableCellProperties,
  DocumentEditor,
  ContinuousEditor,
} from "@lib/docx-editor";
import type { DocxRunProperties } from "@lib/docx/domain/text";
import type { DocxParagraphProperties, DocxParagraph } from "@lib/docx/domain/paragraph";
import type { DocxStyle } from "@lib/docx/domain/styles";
import type { DocxLevel, DocxNumbering, DocxAbstractNum, DocxNum } from "@lib/docx/domain/numbering";
import { docxAbstractNumId, docxNumId, docxIlvl } from "@lib/docx/domain/types";
import type { DocxTableProperties, DocxTableCellProperties, DocxTable } from "@lib/docx/domain/table";
import type { DocxDocument } from "@lib/docx/domain/document";
import { Button } from "@lib/office-editor-components/primitives";
import { docxStyleId } from "@lib/docx/domain/types";
import { px } from "@lib/ooxml/domain/units";

type DocxEditorTestPageProps = {
  readonly onBack: () => void;
};

type TabId = "editor" | "layout" | "run" | "paragraph" | "style" | "numbering" | "table" | "cell";

type Tab = {
  readonly id: TabId;
  readonly label: string;
};

const tabs: readonly Tab[] = [
  { id: "editor", label: "Document Editor" },
  { id: "layout", label: "Layout Editor (New)" },
  { id: "run", label: "Run Properties" },
  { id: "paragraph", label: "Paragraph" },
  { id: "style", label: "Style" },
  { id: "numbering", label: "Numbering" },
  { id: "table", label: "Table" },
  { id: "cell", label: "Table Cell" },
];

// =============================================================================
// Page Styles (matching EditorTestPage)
// =============================================================================

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
  padding: "24px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "24px",
  paddingBottom: "16px",
  borderBottom: "1px solid var(--border-subtle)",
};

const titleStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
};

const tabsContainerStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const tabButtonStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
  transition: "all 150ms ease",
};

const tabButtonActiveStyle: CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: "var(--accent-blue, #0070f3)",
  color: "white",
};

const tabButtonInactiveStyle: CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: "var(--bg-tertiary)",
  color: "var(--text-secondary)",
};

// =============================================================================
// Panel Styles (matching PresentationEditorTest)
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const panelHeaderStyle: CSSProperties = {
  padding: "16px 20px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
};

const panelTitleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "8px",
};

const descriptionStyle: CSSProperties = {
  fontSize: "14px",
  color: "var(--text-secondary)",
  lineHeight: 1.5,
  margin: 0,
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
// Property Editor Test Styles
// =============================================================================

const contentStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
};

const panelStyle: CSSProperties = {
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid var(--border-subtle)",
};

const panelHeadingStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "var(--text-primary)",
};

const jsonPreStyle: CSSProperties = {
  backgroundColor: "var(--bg-tertiary)",
  padding: "12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontFamily: "monospace",
  overflow: "auto",
  maxHeight: "400px",
  color: "var(--text-primary)",
};

// =============================================================================
// Helper Components
// =============================================================================

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={isActive ? tabButtonActiveStyle : tabButtonInactiveStyle}
      onClick={onClick}
    >
      {tab.label}
    </button>
  );
}

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

// =============================================================================
// Property Editor Tests
// =============================================================================

function RunPropertiesTest() {
  const [value, setValue] = useState<DocxRunProperties>(createDefaultRunProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Run Properties Editor</h3>
        <RunPropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

function ParagraphPropertiesTest() {
  const [value, setValue] = useState<DocxParagraphProperties>(createDefaultParagraphProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Paragraph Properties Editor</h3>
        <ParagraphPropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

function StyleEditorTest() {
  const [value, setValue] = useState<DocxStyle>(createDefaultStyle("custom1", "paragraph"));

  const availableStyles = [
    { id: "Normal" as const, name: "Normal", type: "paragraph" as const },
    { id: "Heading1" as const, name: "Heading 1", type: "paragraph" as const },
    { id: "Heading2" as const, name: "Heading 2", type: "paragraph" as const },
  ];

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Style Editor</h3>
        <StyleEditor
          value={value}
          onChange={setValue}
          availableStyles={availableStyles}
          showAdvanced
        />
      </div>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

function NumberingLevelTest() {
  const [value, setValue] = useState<DocxLevel>(createDefaultLevel(0));

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Numbering Level Editor</h3>
        <NumberingLevelEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

function TablePropertiesTest() {
  const [value, setValue] = useState<DocxTableProperties>(createDefaultTableProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Table Properties Editor</h3>
        <TablePropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

function TableCellPropertiesTest() {
  const [value, setValue] = useState<DocxTableCellProperties>(createDefaultTableCellProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Table Cell Properties Editor</h3>
        <TableCellPropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

// =============================================================================
// Demo Document Creation
// =============================================================================

function createDemoParagraph(
  text: string,
  options?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    pStyle?: string;
    /** Force page break before this paragraph */
    pageBreakBefore?: boolean;
    /** Keep this paragraph with the next paragraph on the same page */
    keepNext?: boolean;
    /** Keep all lines of this paragraph together on the same page */
    keepLines?: boolean;
  }
): DocxParagraph {
  const paragraphProps: DocxParagraph["properties"] = {
    ...(options?.pStyle && { pStyle: docxStyleId(options.pStyle) }),
    ...(options?.pageBreakBefore && { pageBreakBefore: true }),
    ...(options?.keepNext && { keepNext: true }),
    ...(options?.keepLines && { keepLines: true }),
  };

  return {
    type: "paragraph",
    properties: Object.keys(paragraphProps ?? {}).length > 0 ? paragraphProps : undefined,
    content: [
      {
        type: "run",
        properties: {
          b: options?.bold,
          i: options?.italic,
          sz: options?.fontSize,
        },
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

/**
 * Run specification for compound formatting paragraphs.
 * Uses WordprocessingML properties directly.
 */
type RunSpec = {
  readonly text: string;
  readonly b?: boolean;        // bold
  readonly i?: boolean;        // italic
  readonly u?: boolean;        // underline (single)
  readonly strike?: boolean;   // strikethrough
  readonly sz?: number;        // font size in half-points
  readonly color?: string;     // color as hex without # (e.g., "FF0000")
  readonly highlight?: "yellow" | "cyan" | "magenta" | "green" | "red" | "blue" | "darkBlue" | "darkCyan" | "darkGreen" | "darkMagenta" | "darkRed" | "darkYellow" | "darkGray" | "lightGray" | "black" | "white";
  readonly vertAlign?: "superscript" | "subscript";
  readonly caps?: boolean;     // all caps
  readonly smallCaps?: boolean;
};

/**
 * Create a paragraph with multiple runs (compound formatting).
 * Each run can have different formatting per WordprocessingML spec.
 */
function createCompoundParagraph(runs: readonly RunSpec[]): DocxParagraph {
  return {
    type: "paragraph",
    content: runs.map((spec) => ({
      type: "run" as const,
      properties: {
        b: spec.b,
        i: spec.i,
        u: spec.u ? { val: "single" as const } : undefined,
        strike: spec.strike,
        sz: spec.sz,
        color: spec.color ? { val: spec.color } : undefined,
        highlight: spec.highlight,
        vertAlign: spec.vertAlign,
        caps: spec.caps,
        smallCaps: spec.smallCaps,
      },
      content: [{ type: "text" as const, value: spec.text }],
    })),
  };
}

function createDemoTable(): DocxTable {
  const createCell = (text: string): DocxTable["rows"][number]["cells"][number] => ({
    type: "tableCell",
    content: [createDemoParagraph(text)],
  });

  return {
    type: "table",
    properties: {
      tblW: { w: 9000, type: "dxa" },
    },
    rows: [
      {
        type: "tableRow",
        cells: [
          createCell("Product"),
          createCell("Q1"),
          createCell("Q2"),
          createCell("Q3"),
        ],
      },
      {
        type: "tableRow",
        cells: [
          createCell("Widget A"),
          createCell("$10,000"),
          createCell("$15,000"),
          createCell("$12,000"),
        ],
      },
      {
        type: "tableRow",
        cells: [
          createCell("Widget B"),
          createCell("$8,000"),
          createCell("$9,500"),
          createCell("$11,000"),
        ],
      },
    ],
  };
}

// =============================================================================
// Numbering Demo Helpers
// =============================================================================

/**
 * Create a paragraph with numbering properties.
 */
function createNumberedParagraph(
  text: string,
  numId: number,
  ilvl: number = 0,
): DocxParagraph {
  return {
    type: "paragraph",
    properties: {
      numPr: {
        numId: docxNumId(numId),
        ilvl: docxIlvl(ilvl),
      },
    },
    content: [
      {
        type: "run",
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

/**
 * Create a demo numbering definition.
 * Includes decimal (1, 2, 3), bullet (•), and Roman numerals (I, II, III).
 */
function createDemoNumbering(): DocxNumbering {
  // Decimal list: 1. 2. 3.
  const decimalAbstract: DocxAbstractNum = {
    abstractNumId: docxAbstractNumId(0),
    multiLevelType: "hybridMultilevel",
    lvl: [
      {
        ilvl: docxIlvl(0),
        start: 1,
        numFmt: "decimal",
        lvlText: { val: "%1." },
        lvlJc: "left",
      },
      {
        ilvl: docxIlvl(1),
        start: 1,
        numFmt: "lowerLetter",
        lvlText: { val: "%2." },
        lvlJc: "left",
      },
    ],
  };

  // Bullet list: •
  const bulletAbstract: DocxAbstractNum = {
    abstractNumId: docxAbstractNumId(1),
    multiLevelType: "hybridMultilevel",
    lvl: [
      {
        ilvl: docxIlvl(0),
        numFmt: "bullet",
        lvlText: { val: "•" },
        lvlJc: "left",
      },
      {
        ilvl: docxIlvl(1),
        numFmt: "bullet",
        lvlText: { val: "◦" },
        lvlJc: "left",
      },
    ],
  };

  // Roman numerals: I. II. III.
  const romanAbstract: DocxAbstractNum = {
    abstractNumId: docxAbstractNumId(2),
    multiLevelType: "hybridMultilevel",
    lvl: [
      {
        ilvl: docxIlvl(0),
        start: 1,
        numFmt: "upperRoman",
        lvlText: { val: "%1." },
        lvlJc: "left",
      },
    ],
  };

  // Numbering instances
  const decimalNum: DocxNum = {
    numId: docxNumId(1),
    abstractNumId: docxAbstractNumId(0),
  };

  const bulletNum: DocxNum = {
    numId: docxNumId(2),
    abstractNumId: docxAbstractNumId(1),
  };

  const romanNum: DocxNum = {
    numId: docxNumId(3),
    abstractNumId: docxAbstractNumId(2),
  };

  return {
    abstractNum: [decimalAbstract, bulletAbstract, romanAbstract],
    num: [decimalNum, bulletNum, romanNum],
  };
}

function createDemoDocument(): DocxDocument {
  const heading1Id = docxStyleId("Heading1");
  const heading2Id = docxStyleId("Heading2");
  const normalId = docxStyleId("Normal");

  return {
    body: {
      content: [
        createDemoParagraph("Welcome to DOCX Editor", { bold: true, fontSize: 48, pStyle: "Heading1" }),
        createDemoParagraph(""),
        createDemoParagraph("This is a demonstration of the DOCX document editor. You can select paragraphs by clicking on them, and double-click to start editing text."),
        createDemoParagraph(""),
        createDemoParagraph("Features", { bold: true, fontSize: 32, pStyle: "Heading2" }),
        createDemoParagraph(""),
        createDemoParagraph("The editor supports the following features:"),
        createDemoParagraph("• Paragraph selection and multi-select (Shift+click or Ctrl+click)"),
        createDemoParagraph("• Inline text editing with IME support"),
        createDemoParagraph("• Keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y for redo)"),
        createDemoParagraph("• Property inspection in the right panel"),
        createDemoParagraph(""),
        createDemoParagraph("Sample Table", { bold: true, fontSize: 32, pStyle: "Heading2" }),
        createDemoParagraph(""),
        createDemoTable(),
        createDemoParagraph(""),
        createDemoParagraph("Try It Out", { bold: true, fontSize: 32, pStyle: "Heading2" }),
        createDemoParagraph(""),
        createDemoParagraph("Click on any paragraph to select it. The inspector panel on the right will show statistics about the document. Double-click to edit text inline."),
      ],
    },
    styles: {
      style: [
        {
          type: "paragraph",
          styleId: heading1Id,
          name: { val: "Heading 1" },
        },
        {
          type: "paragraph",
          styleId: heading2Id,
          name: { val: "Heading 2" },
        },
        {
          type: "paragraph",
          styleId: normalId,
          name: { val: "Normal" },
        },
      ],
    },
  };
}

// =============================================================================
// Document Editor Test Component
// =============================================================================

function DocumentEditorTest() {
  const initialDocument = useMemo(createDemoDocument, []);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={panelHeaderStyle}>
        <h2 style={panelTitleStyle}>Document Editor</h2>
        <p style={descriptionStyle}>
          Full DOCX editor with canvas, selection, text editing, toolbar, and inspector panels.
          Click paragraphs to select. Double-click to edit text. Use keyboard shortcuts.
        </p>
      </div>

      {/* Editor */}
      <div style={editorContainerStyle}>
        <DocumentEditor
          initialDocument={initialDocument}
          showToolbar
          showInspector
          editable
        />
      </div>

      {/* Info Panels */}
      <div style={infoStyle}>
        {/* Keyboard Shortcuts */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Keyboard Shortcuts</h3>
          <div style={shortcutListStyle}>
            <ShortcutItem keys="Delete" description="Delete selected" />
            <ShortcutItem keys="Ctrl+Z" description="Undo" />
            <ShortcutItem keys="Ctrl+Y" description="Redo" />
            <ShortcutItem keys="Escape" description="Clear selection / Exit edit" />
          </div>
        </div>

        {/* Features */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Features</h3>
          <div style={featureListStyle}>
            <FeatureItem text="Paragraph and table rendering" />
            <FeatureItem text="Element selection (single and multi)" />
            <FeatureItem text="Inline text editing with IME" />
            <FeatureItem text="Document statistics in inspector" />
            <FeatureItem text="Style list and application" />
            <FeatureItem text="Document-wide undo/redo" />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Layout Editor Test (New SVG-based Continuous Editor)
// =============================================================================

const layoutEditorContainerStyle: CSSProperties = {
  height: "800px",
  backgroundColor: "#525659",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
  overflow: "auto",
};

function LayoutEditorTest() {
  const demoParagraphs = useMemo<DocxParagraph[]>(() => [
    createDemoParagraph("DOCX グラフィカルテキストエディタ", { bold: true, fontSize: 48 }),
    createDemoParagraph(""),
    createDemoParagraph("このエディタは、新しい統一レイアウトエンジンを使用したSVGベースのテキストレンダリングを実装しています。"),
    createDemoParagraph(""),
    // =============================================================================
    // Compound Formatting Test Section
    // =============================================================================
    createDemoParagraph("複合フォーマットテスト", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    // Basic mixed formatting
    createCompoundParagraph([
      { text: "This sentence has " },
      { text: "bold", b: true },
      { text: ", " },
      { text: "italic", i: true },
      { text: ", and " },
      { text: "bold italic", b: true, i: true },
      { text: " text mixed together." },
    ]),
    createDemoParagraph(""),
    // Underline and strikethrough
    createCompoundParagraph([
      { text: "Text with " },
      { text: "underline", u: true },
      { text: ", " },
      { text: "strikethrough", strike: true },
      { text: ", and " },
      { text: "both combined", u: true, strike: true },
      { text: "." },
    ]),
    createDemoParagraph(""),
    // Different font sizes in one line
    createCompoundParagraph([
      { text: "Small", sz: 16 },  // 8pt
      { text: " Normal", sz: 24 }, // 12pt
      { text: " Large", sz: 36 }, // 18pt
      { text: " Huge", sz: 48 }, // 24pt
      { text: " sizes mixed.", sz: 24 },
    ]),
    createDemoParagraph(""),
    // Colors
    createCompoundParagraph([
      { text: "Red", color: "FF0000" },
      { text: " Green", color: "00FF00" },
      { text: " Blue", color: "0000FF" },
      { text: " Orange", color: "FF8C00" },
      { text: " Purple", color: "800080" },
      { text: " colors in one line." },
    ]),
    createDemoParagraph(""),
    // Highlight colors
    createCompoundParagraph([
      { text: "Yellow highlight", highlight: "yellow" },
      { text: " " },
      { text: "Cyan highlight", highlight: "cyan" },
      { text: " " },
      { text: "Magenta highlight", highlight: "magenta" },
      { text: " backgrounds." },
    ]),
    createDemoParagraph(""),
    // Superscript and subscript
    createCompoundParagraph([
      { text: "E=mc" },
      { text: "2", vertAlign: "superscript" },
      { text: ", H" },
      { text: "2", vertAlign: "subscript" },
      { text: "O, x" },
      { text: "n", vertAlign: "superscript" },
      { text: "+y" },
      { text: "n", vertAlign: "superscript" },
      { text: "=z" },
      { text: "n", vertAlign: "superscript" },
    ]),
    createDemoParagraph(""),
    // Caps variations
    createCompoundParagraph([
      { text: "Normal " },
      { text: "all caps ", caps: true },
      { text: "small caps ", smallCaps: true },
      { text: "text variants." },
    ]),
    createDemoParagraph(""),
    // Complex combination
    createCompoundParagraph([
      { text: "This is a ", sz: 24 },
      { text: "complex", b: true, color: "FF0000", sz: 28 },
      { text: " example with ", sz: 24 },
      { text: "multiple", i: true, u: true, color: "0000FF", sz: 32 },
      { text: " formatting ", sz: 24 },
      { text: "styles", b: true, i: true, highlight: "yellow", sz: 36 },
      { text: " combined.", sz: 24 },
    ]),
    createDemoParagraph(""),
    // Japanese compound formatting
    createCompoundParagraph([
      { text: "日本語の" },
      { text: "太字", b: true },
      { text: "と" },
      { text: "斜体", i: true },
      { text: "と" },
      { text: "下線", u: true },
      { text: "を混在させたテキストです。" },
    ]),
    createDemoParagraph(""),
    // Mixed Japanese and English with formatting
    createCompoundParagraph([
      { text: "日本語 ", sz: 24 },
      { text: "English", b: true, color: "0000FF", sz: 28 },
      { text: " 混在 ", sz: 24 },
      { text: "Mixed", i: true, color: "FF0000", sz: 28 },
      { text: " テキスト。", sz: 24 },
    ]),
    createDemoParagraph(""),
    // =============================================================================
    // Original Test Content
    // =============================================================================
    createDemoParagraph("主な特徴", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("• 共通レイアウトエンジン: PPTXとDOCXで同じレイアウトエンジンを共有"),
    createDemoParagraph("• SVG統一描画: HTMLではなくSVGでテキストを描画し、視覚的一貫性を確保"),
    createDemoParagraph("• ページフロー対応: 複数ページに跨がる連続ドキュメント編集が可能"),
    createDemoParagraph("• 正確なカーソル位置: レイアウト結果に基づく正確なカーソル・選択範囲表示"),
    createDemoParagraph(""),
    createDemoParagraph("技術的な詳細", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("このエディタは以下のモジュールで構成されています:"),
    createDemoParagraph(""),
    createDemoParagraph("1. office-text-layout - 共通テキストレイアウトモジュール"),
    createDemoParagraph("2. docx-adapter - DOCXドメイン型からレイアウト入力への変換"),
    createDemoParagraph("3. svg-renderer - レイアウト結果からSVG要素へのレンダリング"),
    createDemoParagraph("4. page-flow - ページ分割エンジン"),
    createDemoParagraph("5. ContinuousEditor - 連続編集コントローラー"),
    createDemoParagraph(""),
    createDemoParagraph("日本語テキストの例", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。"),
    createDemoParagraph(""),
    createDemoParagraph("The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet."),
    createDemoParagraph(""),
    createDemoParagraph("混合テキスト: Hello, 世界! This is a mixed text example with English and 日本語."),
    createDemoParagraph(""),
    // =============================================================================
    // Page 2 - Additional Content for Multi-Page Testing
    // Uses pageBreakBefore to force a new page
    // =============================================================================
    createDemoParagraph("ページ2: マルチページ編集テスト", { bold: true, fontSize: 40, pageBreakBefore: true }),
    createDemoParagraph(""),
    createDemoParagraph("このセクションは、複数ページにまたがる編集機能をテストするためのコンテンツです。"),
    createDemoParagraph(""),
    createDemoParagraph("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."),
    createDemoParagraph(""),
    createDemoParagraph("Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."),
    createDemoParagraph(""),
    createDemoParagraph("長文テスト", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("祇園精舎の鐘の声、諸行無常の響きあり。沙羅双樹の花の色、盛者必衰の理をあらはす。おごれる人も久しからず、ただ春の夜の夢のごとし。たけき者も遂にはほろびぬ、ひとへに風の前の塵に同じ。"),
    createDemoParagraph(""),
    createDemoParagraph("遠く異朝をとぶらへば、秦の趙高、漢の王莽、梁の朱异、唐の禄山、これらは皆旧主先皇の政にもしたがはず、楽しみをきはめ、諫めをも思ひ入れず、天下の乱れんことを悟らずして、民間の愁ふるところを知らざりしかば、久しからずして、亡じにし者どもなり。"),
    createDemoParagraph(""),
    createDemoParagraph("Cross-Page Selection Test", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("1. First item - try selecting from here"),
    createDemoParagraph("2. Second item - across multiple lines"),
    createDemoParagraph("3. Third item - to test selection"),
    createDemoParagraph("4. Fourth item - spanning pages"),
    createDemoParagraph("5. Fifth item - ensure cursor works"),
    createDemoParagraph(""),
    createDemoParagraph("Paragraph after list items. This paragraph should help test cursor navigation between different content types."),
    createDemoParagraph(""),
    // =============================================================================
    // Page 3 - More Content
    // Uses pageBreakBefore to force a new page
    // =============================================================================
    createDemoParagraph("ページ3: さらなるコンテンツ", { bold: true, fontSize: 40, pageBreakBefore: true }),
    createDemoParagraph(""),
    createDemoParagraph("このページでは、さらに長い文章での編集テストを行います。"),
    createDemoParagraph(""),
    createCompoundParagraph([
      { text: "ページをまたいだ" },
      { text: "選択", b: true, color: "FF0000" },
      { text: "や" },
      { text: "編集", b: true, color: "0000FF" },
      { text: "が正しく動作することを確認してください。" },
    ]),
    createDemoParagraph(""),
    createDemoParagraph("The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!"),
    createDemoParagraph(""),
    createDemoParagraph("Sphinx of black quartz, judge my vow. Two driven jocks help fax my big quiz. The five boxing wizards jump quickly."),
    createDemoParagraph(""),
    createDemoParagraph("編集機能チェックリスト", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("□ ページ1からページ2への選択"),
    createDemoParagraph("□ ページ2からページ3への選択"),
    createDemoParagraph("□ ページ境界でのカーソル移動"),
    createDemoParagraph("□ ページ境界での文字入力"),
    createDemoParagraph("□ ページ境界でのバックスペース"),
    createDemoParagraph("□ 複数ページにまたがる削除"),
    createDemoParagraph(""),
    // =============================================================================
    // keepNext Test Section
    // The heading with keepNext should stay with the following paragraph
    // =============================================================================
    createDemoParagraph("keepNextテスト（見出しと本文を同一ページに保持）", { bold: true, fontSize: 32, keepNext: true }),
    createDemoParagraph("この段落は上の見出しと同じページに表示されるべきです。keepNext属性により、見出しが次の段落と分離されることを防ぎます。これはWordprocessingML仕様(ECMA-376 Section 17.3.1.14)に準拠した動作です。"),
    createDemoParagraph(""),
    createDemoParagraph("keepLinesテスト", { bold: true, fontSize: 32, keepLines: true }),
    createDemoParagraph(""),
    // =============================================================================
    // Numbering Test Section
    // Test numbered lists, bulleted lists, and Roman numerals
    // =============================================================================
    createDemoParagraph("番号付きリストテスト", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("Decimal list (numId=1):", { bold: true }),
    createNumberedParagraph("First item in decimal list", 1, 0),
    createNumberedParagraph("Second item in decimal list", 1, 0),
    createNumberedParagraph("Third item in decimal list", 1, 0),
    createDemoParagraph(""),
    createDemoParagraph("Bullet list (numId=2):", { bold: true }),
    createNumberedParagraph("Bullet item one", 2, 0),
    createNumberedParagraph("Bullet item two", 2, 0),
    createNumberedParagraph("Nested bullet item", 2, 1),
    createNumberedParagraph("Bullet item three", 2, 0),
    createDemoParagraph(""),
    createDemoParagraph("Roman numeral list (numId=3):", { bold: true }),
    createNumberedParagraph("Roman numeral I", 3, 0),
    createNumberedParagraph("Roman numeral II", 3, 0),
    createNumberedParagraph("Roman numeral III", 3, 0),
    createDemoParagraph(""),
    createDemoParagraph("最終テスト段落", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("これがテストドキュメントの最後の段落です。ここまでスクロールして編集できることを確認してください。End of document."),
  ], []);

  // Demo numbering definitions
  const demoNumbering = useMemo(() => createDemoNumbering(), []);

  const [cursorInfo, setCursorInfo] = useState<string>("クリックしてカーソル位置を確認");

  const handleCursorChange = (position: { paragraphIndex: number; charOffset: number }) => {
    setCursorInfo(`段落: ${position.paragraphIndex}, 文字位置: ${position.charOffset}`);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={panelHeaderStyle}>
        <h2 style={panelTitleStyle}>Layout Editor (SVG-based)</h2>
        <p style={descriptionStyle}>
          新しい統一レイアウトエンジンを使用したSVGベースのテキストエディタです。
          クリックでカーソル位置を設定、矢印キーでカーソル移動ができます。
        </p>
      </div>

      {/* Cursor Info */}
      <div style={{ ...infoPanelStyle, marginBottom: "16px" }}>
        <span style={{ fontFamily: "monospace" }}>{cursorInfo}</span>
      </div>

      {/* Editor */}
      <div style={layoutEditorContainerStyle}>
        <ContinuousEditor
          paragraphs={demoParagraphs}
          numbering={demoNumbering}
          contentWidth={px(602)}
          onCursorChange={handleCursorChange}
        />
      </div>

      {/* Info Panels */}
      <div style={infoStyle}>
        {/* Architecture */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>アーキテクチャ</h3>
          <div style={featureListStyle}>
            <FeatureItem text="共通レイアウトエンジン (office-text-layout)" />
            <FeatureItem text="SVG統一描画 (svg-renderer)" />
            <FeatureItem text="ページフロー対応 (page-flow)" />
            <FeatureItem text="連続カーソル管理 (use-continuous-cursor)" />
          </div>
        </div>

        {/* Controls */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>操作方法</h3>
          <div style={shortcutListStyle}>
            <ShortcutItem keys="Click" description="カーソル位置設定" />
            <ShortcutItem keys="←/→" description="カーソル移動" />
            <ShortcutItem keys="Home" description="行頭へ移動" />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tab Content
// =============================================================================

function TabContent({ activeTab }: { activeTab: TabId }) {
  switch (activeTab) {
    case "editor":
      return <DocumentEditorTest />;
    case "layout":
      return <LayoutEditorTest />;
    case "run":
      return <RunPropertiesTest />;
    case "paragraph":
      return <ParagraphPropertiesTest />;
    case "style":
      return <StyleEditorTest />;
    case "numbering":
      return <NumberingLevelTest />;
    case "table":
      return <TablePropertiesTest />;
    case "cell":
      return <TableCellPropertiesTest />;
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function DocxEditorTestPage({ onBack }: DocxEditorTestPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("editor");

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>DOCX Editor Components Test</h1>
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
      </header>

      {/* Tab Navigation */}
      <nav style={tabsContainerStyle}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {/* Tab Content */}
      <TabContent activeTab={activeTab} />
    </div>
  );
}
