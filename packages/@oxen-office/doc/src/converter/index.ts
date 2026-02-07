/**
 * @file Converts DocDocument domain model → DocxDocument for export
 */

import type {
  DocxDocument,
  DocxBody,
  DocxBlockContent,
  DocxParagraph,
  DocxParagraphProperties,
  DocxRun,
  DocxRunProperties,
  DocxText,
} from "@oxen-office/docx";
import type { ParagraphAlignment } from "@oxen-office/ooxml/domain/text";
import { halfPoints } from "@oxen-office/docx";
import type { DocDocument, DocParagraph, DocTextRun } from "../domain/types";

function convertAlignment(
  align: "left" | "center" | "right" | "justify" | undefined,
): ParagraphAlignment | undefined {
  if (!align) {
    return undefined;
  }
  // DOCX uses "both" for justify in WordprocessingML
  if (align === "justify") {
    return "both";
  }
  return align;
}

function convertRunProperties(run: DocTextRun): DocxRunProperties | undefined {
  const hasProps = run.bold || run.italic || run.underline || run.strike || run.fontSize || run.fontName || run.color;
  if (!hasProps) {
    return undefined;
  }

  return {
    ...(run.bold ? { b: true, bCs: true } : {}),
    ...(run.italic ? { i: true, iCs: true } : {}),
    ...(run.underline ? { u: { val: "single" } } : {}),
    ...(run.strike ? { strike: true } : {}),
    ...(run.fontSize ? { sz: halfPoints(run.fontSize * 2), szCs: halfPoints(run.fontSize * 2) } : {}),
    ...(run.fontName ? { rFonts: { ascii: run.fontName, hAnsi: run.fontName } } : {}),
    ...(run.color ? { color: { val: run.color } } : {}),
  };
}

function convertRun(run: DocTextRun): DocxRun {
  const textContent: DocxText = { type: "text", value: run.text, space: "preserve" };
  const properties = convertRunProperties(run);
  return {
    type: "run",
    ...(properties ? { properties } : {}),
    content: [textContent],
  };
}

function convertParagraph(para: DocParagraph): DocxParagraph {
  const jc = convertAlignment(para.alignment);
  const properties: DocxParagraphProperties | undefined = jc ? { jc } : undefined;

  return {
    type: "paragraph",
    ...(properties ? { properties } : {}),
    content: para.runs.map(convertRun),
  };
}

/** Convert a DocDocument to a DocxDocument suitable for export. */
export function convertDocToDocx(doc: DocDocument): DocxDocument {
  const content: DocxBlockContent[] = doc.paragraphs.map(convertParagraph);

  const body: DocxBody = { content };

  return { body };
}
