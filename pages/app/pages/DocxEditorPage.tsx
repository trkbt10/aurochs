/**
 * @file DOCX editor demo page.
 *
 * Wraps ContinuousEditor with a header bar and demo document generation.
 */

import { useMemo, useState, type CSSProperties } from "react";
import { ContinuousEditor } from "@aurochs-ui/docx-editor";
import type { DocxDocument } from "@aurochs-office/docx";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxNumbering, DocxAbstractNum, DocxNum } from "@aurochs-office/docx/domain/numbering";
import { docxAbstractNumId, docxNumId, docxIlvl, halfPoints } from "@aurochs-office/docx/domain/types";
import { ChevronLeftIcon } from "../components/ui";

type Props = {
  readonly document: DocxDocument | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
};

// =============================================================================
// Styles
// =============================================================================

const pageStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "12px 16px",
  background: "var(--bg-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
  flexShrink: 0,
};

const backButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  background: "none",
  border: "1px solid var(--border-strong)",
  borderRadius: "6px",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "13px",
};

const titleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--text-primary)",
};

const editorContainerStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  backgroundColor: "#525659",
};

// =============================================================================
// Demo Content
// =============================================================================

function createDemoParagraph(
  text: string,
  options?: { bold?: boolean; fontSize?: number; pageBreakBefore?: boolean },
): DocxParagraph {
  return {
    type: "paragraph",
    properties: options?.pageBreakBefore ? { pageBreakBefore: true } : undefined,
    content: [
      {
        type: "run",
        properties: {
          b: options?.bold,
          sz: options?.fontSize !== undefined ? halfPoints(options.fontSize * 2) : undefined,
        },
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createNumberedParagraph(text: string, numId: number, ilvl: number = 0): DocxParagraph {
  return {
    type: "paragraph",
    properties: { numPr: { numId: docxNumId(numId), ilvl: docxIlvl(ilvl) } },
    content: [{ type: "run", content: [{ type: "text", value: text }] }],
  };
}

function createDemoNumbering(): DocxNumbering {
  const decimalAbstract: DocxAbstractNum = {
    abstractNumId: docxAbstractNumId(0),
    multiLevelType: "hybridMultilevel",
    lvl: [{ ilvl: docxIlvl(0), start: 1, numFmt: "decimal", lvlText: { val: "%1." }, lvlJc: "left" }],
  };
  const bulletAbstract: DocxAbstractNum = {
    abstractNumId: docxAbstractNumId(1),
    multiLevelType: "hybridMultilevel",
    lvl: [{ ilvl: docxIlvl(0), numFmt: "bullet", lvlText: { val: "\u2022" }, lvlJc: "left" }],
  };
  const decimalNum: DocxNum = { numId: docxNumId(1), abstractNumId: docxAbstractNumId(0) };
  const bulletNum: DocxNum = { numId: docxNumId(2), abstractNumId: docxAbstractNumId(1) };
  return { abstractNum: [decimalAbstract, bulletAbstract], num: [decimalNum, bulletNum] };
}

function createDemoDocument(): { paragraphs: DocxParagraph[]; numbering: DocxNumbering } {
  return {
    paragraphs: [
      createDemoParagraph("DOCX Editor Demo", { bold: true, fontSize: 36 }),
      createDemoParagraph(""),
      createDemoParagraph(
        "This is a demo document rendered with the ContinuousEditor. " +
          "It uses a shared layout engine for SVG-based text rendering.",
      ),
      createDemoParagraph(""),
      createDemoParagraph("Features", { bold: true, fontSize: 24 }),
      createDemoParagraph(""),
      createNumberedParagraph("Shared layout engine for PPTX and DOCX", 1),
      createNumberedParagraph("SVG-based text rendering for visual consistency", 1),
      createNumberedParagraph("Multi-page document editing with page flow", 1),
      createNumberedParagraph("Accurate cursor positioning and selection", 1),
      createDemoParagraph(""),
      createDemoParagraph("Keyboard Shortcuts", { bold: true, fontSize: 24 }),
      createDemoParagraph(""),
      createNumberedParagraph("Arrow keys: move cursor", 2),
      createNumberedParagraph("Shift+arrows: extend selection", 2),
      createNumberedParagraph("Cmd+B/I/U: bold, italic, underline", 2),
      createNumberedParagraph("Cmd+Z/Y: undo/redo", 2),
      createDemoParagraph(""),
      createDemoParagraph("Page 2", { bold: true, fontSize: 36, pageBreakBefore: true }),
      createDemoParagraph(""),
      createDemoParagraph(
        "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet.",
      ),
      createDemoParagraph(""),
      createDemoParagraph(
        "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。",
      ),
    ],
    numbering: createDemoNumbering(),
  };
}

// =============================================================================
// Component
// =============================================================================

/** DOCX editor page with header, ContinuousEditor, and vertical/horizontal toggle. */
export function DocxEditorPage({ document, fileName, onBack }: Props) {
  const [isVertical, setIsVertical] = useState(false);

  const { paragraphs, numbering } = useMemo(() => {
    if (document) {
      return {
        paragraphs: document.body.content.filter((c): c is DocxParagraph => c.type === "paragraph"),
        numbering: document.numbering,
      };
    }
    return createDemoDocument();
  }, [document]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <button style={backButtonStyle} onClick={onBack}>
          <ChevronLeftIcon size={16} />
          <span>Back</span>
        </button>
        <span style={titleStyle}>{fileName ?? "DOCX Demo"}</span>
        <button
          style={{
            ...backButtonStyle,
            marginLeft: "auto",
            background: isVertical ? "var(--accent-blue)" : "none",
            color: isVertical ? "#fff" : "var(--text-secondary)",
            borderColor: isVertical ? "var(--accent-blue)" : "var(--border-strong)",
          }}
          onClick={() => setIsVertical((v) => !v)}
        >
          {isVertical ? "Vertical" : "Horizontal"}
        </button>
      </header>
      <div style={editorContainerStyle}>
        <ContinuousEditor
          paragraphs={paragraphs}
          numbering={numbering}
          sectPr={isVertical ? { textDirection: "tbRl" } : undefined}
        />
      </div>
    </div>
  );
}
