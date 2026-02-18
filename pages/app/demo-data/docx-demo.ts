/**
 * @file Demo DOCX document for the editor page.
 */

import type { DocxDocument } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxNumbering, DocxAbstractNum, DocxNum } from "@aurochs-office/docx/domain/numbering";
import { docxAbstractNumId, docxNumId, docxIlvl, halfPoints } from "@aurochs-office/docx/domain/types";

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

export function createDemoParagraphsAndNumbering(): { paragraphs: DocxParagraph[]; numbering: DocxNumbering } {
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

/** Create a complete DocxDocument for the DocxDocumentEditor. */
export function createDemoDocxDocument(): DocxDocument {
  const { paragraphs, numbering } = createDemoParagraphsAndNumbering();
  return {
    body: { content: paragraphs },
    numbering,
  };
}
