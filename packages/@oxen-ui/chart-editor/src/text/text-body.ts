/**
 * @file Chart TextBody helpers
 */

import type { TextBody, TextRun } from "@oxen-office/chart/domain/text";






export function getPlainText(textBody: TextBody): string {
  const lines = textBody.paragraphs.map((p) => runsToString(p.runs));
  return lines.join("\n");
}






export function createDefaultTextBody(text?: string): TextBody {
  return {
    bodyProperties: {},
    paragraphs: [
      {
        properties: {},
        runs: [{ type: "text", text: text ?? "" }],
      },
    ],
  };
}






export function replacePlainText(textBody: TextBody, text: string): TextBody {
  const paragraphs = text.split("\n").map((line) => ({
    properties: {},
    runs: [{ type: "text" as const, text: line }],
  }));

  return {
    ...textBody,
    paragraphs,
  };
}

function runsToString(runs: readonly TextRun[]): string {
  const parts: string[] = [];
  for (const run of runs) {
    if (run.type === "text" || run.type === "field") {
      parts.push(run.text);
      continue;
    }
    if (run.type === "break") {
      parts.push("\n");
    }
  }
  return parts.join("");
}

