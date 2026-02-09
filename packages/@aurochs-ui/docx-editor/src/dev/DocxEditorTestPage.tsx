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
  ContinuousEditor,
} from "@aurochs-ui/docx-editor";
import type { DocxRunProperties } from "@aurochs-office/docx/domain/run";
import type { DocxParagraphProperties, DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxStyle } from "@aurochs-office/docx/domain/styles";
import type { DocxLevel, DocxNumbering, DocxAbstractNum, DocxNum } from "@aurochs-office/docx/domain/numbering";
import { docxAbstractNumId, docxNumId, docxIlvl, docxStyleId, halfPoints } from "@aurochs-office/docx/domain/types";
import type { DocxTableProperties, DocxTableCellProperties } from "@aurochs-office/docx/domain/table";
import { Button } from "@aurochs-ui/ui-components/primitives";

type DocxEditorTestPageProps = {
  readonly onBack: () => void;
};

type TabId = "editor" | "run" | "paragraph" | "style" | "numbering" | "table" | "cell";

type Tab = {
  readonly id: TabId;
  readonly label: string;
};

const tabs: readonly Tab[] = [
  { id: "editor", label: "Document Editor" },
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

function TabButton({ tab, isActive, onClick }: { tab: Tab; isActive: boolean; onClick: () => void }) {
  return (
    <button type="button" style={isActive ? tabButtonActiveStyle : tabButtonInactiveStyle} onClick={onClick}>
      {tab.label}
    </button>
  );
}

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
  const [value, setValue] = useState<DocxStyle>(createDefaultStyle(docxStyleId("custom1"), "paragraph"));

  const availableStyles = [
    { id: docxStyleId("Normal"), name: "Normal", type: "paragraph" as const },
    { id: docxStyleId("Heading1"), name: "Heading 1", type: "paragraph" as const },
    { id: docxStyleId("Heading2"), name: "Heading 2", type: "paragraph" as const },
  ];

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Style Editor</h3>
        <StyleEditor value={value} onChange={setValue} availableStyles={availableStyles} showAdvanced />
      </div>
      <div style={panelStyle}>
        <h3 style={panelHeadingStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

function NumberingLevelTest() {
  const [value, setValue] = useState<DocxLevel>(createDefaultLevel(docxIlvl(0)));

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
  },
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
          sz: options?.fontSize !== undefined ? halfPoints(options.fontSize * 2) : undefined,
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
  readonly b?: boolean; // bold
  readonly i?: boolean; // italic
  readonly u?: boolean; // underline (single)
  readonly strike?: boolean; // strikethrough
  readonly sz?: number; // font size in half-points
  readonly color?: string; // color as hex without # (e.g., "FF0000")
  readonly highlight?:
    | "yellow"
    | "cyan"
    | "magenta"
    | "green"
    | "red"
    | "blue"
    | "darkBlue"
    | "darkCyan"
    | "darkGreen"
    | "darkMagenta"
    | "darkRed"
    | "darkYellow"
    | "darkGray"
    | "lightGray"
    | "black"
    | "white";
  readonly vertAlign?: "superscript" | "subscript";
  readonly caps?: boolean; // all caps
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
        sz: spec.sz !== undefined ? halfPoints(spec.sz) : undefined,
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

// =============================================================================
// Numbering Demo Helpers
// =============================================================================

/**
 * Create a paragraph with numbering properties.
 */
function createNumberedParagraph(text: string, numId: number, ilvl: number = 0): DocxParagraph {
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
 * Includes decimal (1, 2, 3), bullet (*), and Roman numerals (I, II, III).
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

  // Bullet list: *
  const bulletAbstract: DocxAbstractNum = {
    abstractNumId: docxAbstractNumId(1),
    multiLevelType: "hybridMultilevel",
    lvl: [
      {
        ilvl: docxIlvl(0),
        numFmt: "bullet",
        lvlText: { val: "\u2022" },
        lvlJc: "left",
      },
      {
        ilvl: docxIlvl(1),
        numFmt: "bullet",
        lvlText: { val: "\u25E6" },
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

// =============================================================================
// Document Editor Test Component
// =============================================================================

const documentEditorContainerStyle: CSSProperties = {
  height: "800px",
  backgroundColor: "#525659",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
  overflow: "auto",
};

function DocumentEditorTest() {
  const [isVertical, setIsVertical] = useState(false);
  const demoParagraphs = useMemo<DocxParagraph[]>(
    () => [
      createDemoParagraph("DOCX \u30B0\u30E9\u30D5\u30A3\u30AB\u30EB\u30C6\u30AD\u30B9\u30C8\u30A8\u30C7\u30A3\u30BF", { bold: true, fontSize: 48 }),
      createDemoParagraph(""),
      createDemoParagraph(
        "\u3053\u306E\u30A8\u30C7\u30A3\u30BF\u306F\u3001\u65B0\u3057\u3044\u7D71\u4E00\u30EC\u30A4\u30A2\u30A6\u30C8\u30A8\u30F3\u30B8\u30F3\u3092\u4F7F\u7528\u3057\u305FSVG\u30D9\u30FC\u30B9\u306E\u30C6\u30AD\u30B9\u30C8\u30EC\u30F3\u30C0\u30EA\u30F3\u30B0\u3092\u5B9F\u88C5\u3057\u3066\u3044\u307E\u3059\u3002",
      ),
      createDemoParagraph(""),
      // Compound Formatting Test Section
      createDemoParagraph("\u8907\u5408\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u30C6\u30B9\u30C8", { bold: true, fontSize: 32 }),
      createDemoParagraph(""),
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
      createCompoundParagraph([
        { text: "Small", sz: 16 },
        { text: " Normal", sz: 24 },
        { text: " Large", sz: 36 },
        { text: " Huge", sz: 48 },
        { text: " sizes mixed.", sz: 24 },
      ]),
      createDemoParagraph(""),
      createCompoundParagraph([
        { text: "Red", color: "FF0000" },
        { text: " Green", color: "00FF00" },
        { text: " Blue", color: "0000FF" },
        { text: " Orange", color: "FF8C00" },
        { text: " Purple", color: "800080" },
        { text: " colors in one line." },
      ]),
      createDemoParagraph(""),
      createCompoundParagraph([
        { text: "Yellow highlight", highlight: "yellow" },
        { text: " " },
        { text: "Cyan highlight", highlight: "cyan" },
        { text: " " },
        { text: "Magenta highlight", highlight: "magenta" },
        { text: " backgrounds." },
      ]),
      createDemoParagraph(""),
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
      createCompoundParagraph([
        { text: "\u65E5\u672C\u8A9E\u306E" },
        { text: "\u592A\u5B57", b: true },
        { text: "\u3068" },
        { text: "\u659C\u4F53", i: true },
        { text: "\u3068" },
        { text: "\u4E0B\u7DDA", u: true },
        { text: "\u3092\u6DF7\u5728\u3055\u305B\u305F\u30C6\u30AD\u30B9\u30C8\u3067\u3059\u3002" },
      ]),
      createDemoParagraph(""),
      // Main features section
      createDemoParagraph("\u4E3B\u306A\u7279\u5FB4", { bold: true, fontSize: 32 }),
      createDemoParagraph(""),
      createDemoParagraph("\u2022 \u5171\u901A\u30EC\u30A4\u30A2\u30A6\u30C8\u30A8\u30F3\u30B8\u30F3: PPTX\u3068DOCX\u3067\u540C\u3058\u30EC\u30A4\u30A2\u30A6\u30C8\u30A8\u30F3\u30B8\u30F3\u3092\u5171\u6709"),
      createDemoParagraph("\u2022 SVG\u7D71\u4E00\u63CF\u753B: HTML\u3067\u306F\u306A\u304FSVG\u3067\u30C6\u30AD\u30B9\u30C8\u3092\u63CF\u753B\u3057\u3001\u8996\u899A\u7684\u4E00\u8CAB\u6027\u3092\u78BA\u4FDD"),
      createDemoParagraph("\u2022 \u30DA\u30FC\u30B8\u30D5\u30ED\u30FC\u5BFE\u5FDC: \u8907\u6570\u30DA\u30FC\u30B8\u306B\u8DE8\u304C\u308B\u9023\u7D9A\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u7DE8\u96C6\u304C\u53EF\u80FD"),
      createDemoParagraph("\u2022 \u6B63\u78BA\u306A\u30AB\u30FC\u30BD\u30EB\u4F4D\u7F6E: \u30EC\u30A4\u30A2\u30A6\u30C8\u7D50\u679C\u306B\u57FA\u3065\u304F\u6B63\u78BA\u306A\u30AB\u30FC\u30BD\u30EB\u30FB\u9078\u629E\u7BC4\u56F2\u8868\u793A"),
      createDemoParagraph(""),
      createDemoParagraph("\u65E5\u672C\u8A9E\u30C6\u30AD\u30B9\u30C8\u306E\u4F8B", { bold: true, fontSize: 32 }),
      createDemoParagraph(""),
      createDemoParagraph(
        "\u543E\u8F29\u306F\u732B\u3067\u3042\u308B\u3002\u540D\u524D\u306F\u307E\u3060\u7121\u3044\u3002\u3069\u3053\u3067\u751F\u308C\u305F\u304B\u3068\u3093\u3068\u898B\u5F53\u304C\u3064\u304B\u306C\u3002\u4F55\u3067\u3082\u8584\u6697\u3044\u3058\u3081\u3058\u3081\u3057\u305F\u6240\u3067\u30CB\u30E3\u30FC\u30CB\u30E3\u30FC\u6CE3\u3044\u3066\u3044\u305F\u4E8B\u3060\u3051\u306F\u8A18\u61B6\u3057\u3066\u3044\u308B\u3002",
      ),
      createDemoParagraph(""),
      createDemoParagraph(
        "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet.",
      ),
      createDemoParagraph(""),
      // Page 2
      createDemoParagraph("\u30DA\u30FC\u30B82: \u30DE\u30EB\u30C1\u30DA\u30FC\u30B8\u7DE8\u96C6\u30C6\u30B9\u30C8", { bold: true, fontSize: 40, pageBreakBefore: true }),
      createDemoParagraph(""),
      createDemoParagraph("\u3053\u306E\u30BB\u30AF\u30B7\u30E7\u30F3\u306F\u3001\u8907\u6570\u30DA\u30FC\u30B8\u306B\u307E\u305F\u304C\u308B\u7DE8\u96C6\u6A5F\u80FD\u3092\u30C6\u30B9\u30C8\u3059\u308B\u305F\u3081\u306E\u30B3\u30F3\u30C6\u30F3\u30C4\u3067\u3059\u3002"),
      createDemoParagraph(""),
      createDemoParagraph(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      ),
      createDemoParagraph(""),
      createDemoParagraph("\u7947\u5712\u7CBE\u820E\u306E\u9418\u306E\u58F0\u3001\u8AF8\u884C\u7121\u5E38\u306E\u97FF\u304D\u3042\u308A\u3002\u6C99\u7F85\u53CC\u6A39\u306E\u82B1\u306E\u8272\u3001\u76DB\u8005\u5FC5\u8870\u306E\u7406\u3092\u3042\u3089\u306F\u3059\u3002"),
      createDemoParagraph(""),
      // Page 3
      createDemoParagraph("\u30DA\u30FC\u30B83: \u3055\u3089\u306A\u308B\u30B3\u30F3\u30C6\u30F3\u30C4", { bold: true, fontSize: 40, pageBreakBefore: true }),
      createDemoParagraph(""),
      createCompoundParagraph([
        { text: "\u30DA\u30FC\u30B8\u3092\u307E\u305F\u3044\u3060" },
        { text: "\u9078\u629E", b: true, color: "FF0000" },
        { text: "\u3084" },
        { text: "\u7DE8\u96C6", b: true, color: "0000FF" },
        { text: "\u304C\u6B63\u3057\u304F\u52D5\u4F5C\u3059\u308B\u3053\u3068\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" },
      ]),
      createDemoParagraph(""),
      // Numbering test
      createDemoParagraph("\u756A\u53F7\u4ED8\u304D\u30EA\u30B9\u30C8\u30C6\u30B9\u30C8", { bold: true, fontSize: 32 }),
      createDemoParagraph(""),
      createNumberedParagraph("First item in decimal list", 1, 0),
      createNumberedParagraph("Second item in decimal list", 1, 0),
      createNumberedParagraph("Third item in decimal list", 1, 0),
      createDemoParagraph(""),
      createNumberedParagraph("Bullet item one", 2, 0),
      createNumberedParagraph("Bullet item two", 2, 0),
      createNumberedParagraph("Nested bullet item", 2, 1),
      createDemoParagraph(""),
      createDemoParagraph("\u6700\u7D42\u30C6\u30B9\u30C8\u6BB5\u843D", { bold: true, fontSize: 32 }),
      createDemoParagraph(""),
      createDemoParagraph("\u3053\u308C\u304C\u30C6\u30B9\u30C8\u30C9\u30AD\u30E5\u30E1\u30F3\u30C8\u306E\u6700\u5F8C\u306E\u6BB5\u843D\u3067\u3059\u3002End of document."),
    ],
    [],
  );

  const demoNumbering = useMemo(() => createDemoNumbering(), []);
  const [cursorInfo, setCursorInfo] = useState<string>("\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u30AB\u30FC\u30BD\u30EB\u4F4D\u7F6E\u3092\u78BA\u8A8D");

  const handleCursorChange = (position: { paragraphIndex: number; charOffset: number }) => {
    setCursorInfo(`\u6BB5\u843D: ${position.paragraphIndex}, \u6587\u5B57\u4F4D\u7F6E: ${position.charOffset}`);
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={panelHeaderStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={panelTitleStyle}>Document Editor</h2>
          <button
            type="button"
            onClick={() => setIsVertical((v) => !v)}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: isVertical ? "var(--accent-blue, #0070f3)" : "var(--bg-tertiary)",
              color: isVertical ? "white" : "var(--text-secondary)",
            }}
          >
            {isVertical ? "\u7E26\u66F8\u304D" : "\u6A2A\u66F8\u304D"}
          </button>
        </div>
        <p style={descriptionStyle}>
          {"\u7D71\u4E00\u30EC\u30A4\u30A2\u30A6\u30C8\u30A8\u30F3\u30B8\u30F3\u3092\u4F7F\u7528\u3057\u305FSVG\u30D9\u30FC\u30B9\u306E\u30C6\u30AD\u30B9\u30C8\u30A8\u30C7\u30A3\u30BF\u3067\u3059\u3002\u30AF\u30EA\u30C3\u30AF\u3067\u30AB\u30FC\u30BD\u30EB\u4F4D\u7F6E\u3092\u8A2D\u5B9A\u3001\u77E2\u5370\u30AD\u30FC\u3067\u30AB\u30FC\u30BD\u30EB\u79FB\u52D5\u304C\u3067\u304D\u307E\u3059\u3002"}
        </p>
      </div>

      {/* Cursor Info */}
      <div style={{ ...infoPanelStyle, marginBottom: "16px" }}>
        <span style={{ fontFamily: "monospace" }}>{cursorInfo}</span>
      </div>

      {/* Editor */}
      <div style={documentEditorContainerStyle}>
        <ContinuousEditor
          paragraphs={demoParagraphs}
          numbering={demoNumbering}
          onCursorChange={handleCursorChange}
          sectPr={isVertical ? { textDirection: "tbRl" } : undefined}
        />
      </div>

      {/* Info Panels */}
      <div style={infoStyle}>
        {/* Keyboard Shortcuts */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Keyboard Shortcuts</h3>
          <div style={shortcutListStyle}>
            <ShortcutItem keys="\u2190/\u2192/\u2191/\u2193" description="\u30AB\u30FC\u30BD\u30EB\u79FB\u52D5" />
            <ShortcutItem keys="Shift+\u77E2\u5370" description="\u9078\u629E\u7BC4\u56F2\u62E1\u5F35" />
            <ShortcutItem keys="Cmd+X/C/V" description="\u30AB\u30C3\u30C8/\u30B3\u30D4\u30FC/\u30DA\u30FC\u30B9\u30C8" />
            <ShortcutItem keys="Cmd+B/I/U" description="\u592A\u5B57/\u659C\u4F53/\u4E0B\u7DDA" />
            <ShortcutItem keys="Cmd+Z/Y" description="Undo/Redo" />
          </div>
        </div>

        {/* Features */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Features</h3>
          <div style={featureListStyle}>
            <FeatureItem text="\u5171\u901A\u30EC\u30A4\u30A2\u30A6\u30C8\u30A8\u30F3\u30B8\u30F3 (office-text-layout)" />
            <FeatureItem text="SVG\u7D71\u4E00\u63CF\u753B (svg-renderer)" />
            <FeatureItem text="\u30DA\u30FC\u30B8\u30D5\u30ED\u30FC\u5BFE\u5FDC (page-flow)" />
            <FeatureItem text="IME\u5165\u529B\u5BFE\u5FDC" />
            <FeatureItem text="\u8907\u5408\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u5BFE\u5FDC" />
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



/** DOCX editor test page with tabbed navigation for all editor components. */
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
          <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
        ))}
      </nav>

      {/* Tab Content */}
      <TabContent activeTab={activeTab} />
    </div>
  );
}
