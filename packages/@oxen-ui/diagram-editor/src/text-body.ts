/**
 * @file Diagram text-body helpers
 *
 * Provides best-effort text extraction for labels without depending on a
 * specific OOXML format implementation.
 */

export type DiagramTextRun = { readonly type: "text"; readonly text: string };
export type DiagramTextParagraph = { readonly runs: readonly unknown[] };
export type DiagramTextBody = { readonly paragraphs: readonly DiagramTextParagraph[] };


























/**
 * Extract plain text from a diagram text body for display labels.
 */
export function extractPlainTextFromTextBody(textBody: unknown): string | undefined {
  if (!isDiagramTextBody(textBody)) {
    return undefined;
  }

  const texts: string[] = [];
  for (const para of textBody.paragraphs) {
    for (const run of para.runs) {
      if (isDiagramTextRun(run)) {
        texts.push(run.text);
      }
    }
  }

  const text = texts.join(" ").trim();
  return text.length > 0 ? text : undefined;
}

function isDiagramTextBody(value: unknown): value is DiagramTextBody {
  if (!isRecord(value)) {
    return false;
  }
  const paragraphs = value.paragraphs;
  if (!Array.isArray(paragraphs)) {
    return false;
  }
  return paragraphs.every((p) => isRecord(p) && Array.isArray(p.runs));
}

function isDiagramTextRun(value: unknown): value is DiagramTextRun {
  if (!isRecord(value)) {
    return false;
  }
  return value.type === "text" && typeof value.text === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

