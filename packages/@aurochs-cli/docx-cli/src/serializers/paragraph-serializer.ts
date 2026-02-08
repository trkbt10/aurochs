/**
 * @file Paragraph serialization utilities for JSON output
 */

import type { DocxParagraph, DocxParagraphContent, DocxRun, DocxRunContent } from "@aurochs-office/docx";

// =============================================================================
// JSON Types
// =============================================================================

export type RunContentJson = {
  readonly type: "text" | "tab" | "break" | "symbol" | "other";
  readonly text?: string;
  readonly breakType?: string;
};

export type RunJson = {
  readonly type: "run";
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strike?: boolean;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly color?: string;
  readonly highlight?: string;
};

export type HyperlinkJson = {
  readonly type: "hyperlink";
  readonly anchor?: string;
  readonly tooltip?: string;
  readonly text: string;
};

export type ParagraphContentJson = RunJson | HyperlinkJson;

export type ParagraphJson = {
  readonly style?: string;
  readonly alignment?: string;
  readonly numbering?: {
    readonly numId: number;
    readonly level: number;
  };
  readonly content: readonly ParagraphContentJson[];
};

// =============================================================================
// Serialization Functions
// =============================================================================

function extractTextFromRunContent(content: DocxRunContent): string {
  switch (content.type) {
    case "text":
      return content.value;
    case "tab":
      return "\t";
    case "break":
      return content.breakType === "page" ? "\n\n" : "\n";
    default:
      return "";
  }
}

function serializeRun(run: DocxRun): RunJson {
  const text = run.content.map(extractTextFromRunContent).join("");
  const props = run.properties;

  return {
    type: "run",
    text,
    ...(props?.b && { bold: true }),
    ...(props?.i && { italic: true }),
    ...(props?.u && { underline: true }),
    ...(props?.strike && { strike: true }),
    ...(props?.sz && { fontSize: props.sz / 2 }), // half-points to points
    ...(props?.rFonts?.ascii && { fontFamily: props.rFonts.ascii }),
    ...(props?.color?.val && { color: props.color.val }),
    ...(props?.highlight && { highlight: props.highlight }),
  };
}

function serializeParagraphContent(content: DocxParagraphContent): ParagraphContentJson | undefined {
  switch (content.type) {
    case "run":
      return serializeRun(content);
    case "hyperlink":
      return {
        type: "hyperlink",
        anchor: content.anchor,
        tooltip: content.tooltip,
        text: content.content.map((r) => r.content.map(extractTextFromRunContent).join("")).join(""),
      };
    default:
      return undefined;
  }
}

/**
 * Serialize a DOCX paragraph to JSON format.
 */
export function serializeParagraph(paragraph: DocxParagraph): ParagraphJson {
  const props = paragraph.properties;
  const content = paragraph.content
    .map(serializeParagraphContent)
    .filter((c): c is ParagraphContentJson => c !== undefined);

  return {
    content,
    ...(props?.pStyle && { style: props.pStyle }),
    ...(props?.jc && { alignment: props.jc }),
    ...(props?.numPr?.numId !== undefined &&
      props?.numPr?.ilvl !== undefined && {
        numbering: {
          numId: props.numPr.numId,
          level: props.numPr.ilvl,
        },
      }),
  };
}
