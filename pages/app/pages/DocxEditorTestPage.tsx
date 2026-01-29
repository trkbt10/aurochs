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
} from "@oxen-ui/docx-editor";
import type { DocxRunProperties } from "@oxen-office/docx/domain/run";
import type { DocxParagraphProperties, DocxParagraph } from "@oxen-office/docx/domain/paragraph";
import type { DocxStyle } from "@oxen-office/docx/domain/styles";
import type { DocxLevel, DocxNumbering, DocxAbstractNum, DocxNum } from "@oxen-office/docx/domain/numbering";
import { docxAbstractNumId, docxNumId, docxIlvl, docxStyleId, halfPoints } from "@oxen-office/docx/domain/types";
import type { DocxTableProperties, DocxTableCellProperties } from "@oxen-office/docx/domain/table";
import { Button } from "@oxen-ui/ui-components/primitives";

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
  const demoParagraphs = useMemo<DocxParagraph[]>(() => [
    createDemoParagraph("DOCX グラフィカルテキストエディタ", { bold: true, fontSize: 48 }),
    createDemoParagraph(""),
    createDemoParagraph("このエディタは、新しい統一レイアウトエンジンを使用したSVGベースのテキストレンダリングを実装しています。"),
    createDemoParagraph(""),
    // Compound Formatting Test Section
    createDemoParagraph("複合フォーマットテスト", { bold: true, fontSize: 32 }),
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
      { text: "日本語の" },
      { text: "太字", b: true },
      { text: "と" },
      { text: "斜体", i: true },
      { text: "と" },
      { text: "下線", u: true },
      { text: "を混在させたテキストです。" },
    ]),
    createDemoParagraph(""),
    // Main features section
    createDemoParagraph("主な特徴", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("• 共通レイアウトエンジン: PPTXとDOCXで同じレイアウトエンジンを共有"),
    createDemoParagraph("• SVG統一描画: HTMLではなくSVGでテキストを描画し、視覚的一貫性を確保"),
    createDemoParagraph("• ページフロー対応: 複数ページに跨がる連続ドキュメント編集が可能"),
    createDemoParagraph("• 正確なカーソル位置: レイアウト結果に基づく正確なカーソル・選択範囲表示"),
    createDemoParagraph(""),
    createDemoParagraph("日本語テキストの例", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。"),
    createDemoParagraph(""),
    createDemoParagraph("The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet."),
    createDemoParagraph(""),
    // Page 2
    createDemoParagraph("ページ2: マルチページ編集テスト", { bold: true, fontSize: 40, pageBreakBefore: true }),
    createDemoParagraph(""),
    createDemoParagraph("このセクションは、複数ページにまたがる編集機能をテストするためのコンテンツです。"),
    createDemoParagraph(""),
    createDemoParagraph("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."),
    createDemoParagraph(""),
    createDemoParagraph("祇園精舎の鐘の声、諸行無常の響きあり。沙羅双樹の花の色、盛者必衰の理をあらはす。"),
    createDemoParagraph(""),
    // Page 3
    createDemoParagraph("ページ3: さらなるコンテンツ", { bold: true, fontSize: 40, pageBreakBefore: true }),
    createDemoParagraph(""),
    createCompoundParagraph([
      { text: "ページをまたいだ" },
      { text: "選択", b: true, color: "FF0000" },
      { text: "や" },
      { text: "編集", b: true, color: "0000FF" },
      { text: "が正しく動作することを確認してください。" },
    ]),
    createDemoParagraph(""),
    // Numbering test
    createDemoParagraph("番号付きリストテスト", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createNumberedParagraph("First item in decimal list", 1, 0),
    createNumberedParagraph("Second item in decimal list", 1, 0),
    createNumberedParagraph("Third item in decimal list", 1, 0),
    createDemoParagraph(""),
    createNumberedParagraph("Bullet item one", 2, 0),
    createNumberedParagraph("Bullet item two", 2, 0),
    createNumberedParagraph("Nested bullet item", 2, 1),
    createDemoParagraph(""),
    createDemoParagraph("最終テスト段落", { bold: true, fontSize: 32 }),
    createDemoParagraph(""),
    createDemoParagraph("これがテストドキュメントの最後の段落です。End of document."),
  ], []);

  const demoNumbering = useMemo(() => createDemoNumbering(), []);
  const [cursorInfo, setCursorInfo] = useState<string>("クリックしてカーソル位置を確認");

  const handleCursorChange = (position: { paragraphIndex: number; charOffset: number }) => {
    setCursorInfo(`段落: ${position.paragraphIndex}, 文字位置: ${position.charOffset}`);
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
            {isVertical ? "縦書き" : "横書き"}
          </button>
        </div>
        <p style={descriptionStyle}>
          統一レイアウトエンジンを使用したSVGベースのテキストエディタです。
          クリックでカーソル位置を設定、矢印キーでカーソル移動ができます。
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
            <ShortcutItem keys="←/→/↑/↓" description="カーソル移動" />
            <ShortcutItem keys="Shift+矢印" description="選択範囲拡張" />
            <ShortcutItem keys="Cmd+X/C/V" description="カット/コピー/ペースト" />
            <ShortcutItem keys="Cmd+B/I/U" description="太字/斜体/下線" />
            <ShortcutItem keys="Cmd+Z/Y" description="Undo/Redo" />
          </div>
        </div>

        {/* Features */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Features</h3>
          <div style={featureListStyle}>
            <FeatureItem text="共通レイアウトエンジン (office-text-layout)" />
            <FeatureItem text="SVG統一描画 (svg-renderer)" />
            <FeatureItem text="ページフロー対応 (page-flow)" />
            <FeatureItem text="IME入力対応" />
            <FeatureItem text="複合フォーマット対応" />
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
