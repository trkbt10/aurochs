/**
 * @file Regression test: text decoding for panel2.pdf page 2 (Form XObject font scopes)
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { parsePdf, type PdfText } from "../src/pdf";

const PDF_PATH = path.resolve("fixtures/samples/panel2.pdf");

function buildLines(texts: readonly PdfText[]): string[] {
  const bucketed = new Map<number, PdfText[]>();
  for (const t of texts) {
    const y = Math.round((t.y as number) * 2); // 0.5pt bucket
    const list = bucketed.get(y) ?? [];
    list.push(t);
    bucketed.set(y, list);
  }

  const lineYs = [...bucketed.keys()].sort((a, b) => b - a);
  return lineYs.map((y) => {
    const items = bucketed.get(y) ?? [];
    const sorted = items.slice().sort((a, b) => (a.x as number) - (b.x as number));
    return sorted.map((t) => t.text).join("");
  });
}

describe("PDF text decoding (panel2.pdf page 2)", () => {
  it("decodes code blocks and avoids control characters", async () => {
    const bytes = fs.readFileSync(PDF_PATH);
    const doc = await parsePdf(bytes, { pages: [2] });

    const page = doc.pages[0];
    if (!page) {
      throw new Error("Expected page 2 to exist");
    }

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    expect(texts.length).toBeGreaterThan(0);

    // Ensure XML-invalid control chars are removed/replaced in decoded output.
    // eslint-disable-next-line no-control-regex -- PDF text may contain control bytes, but decoded output must not.
    const invalidXmlControls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
    expect(texts.some((t) => invalidXmlControls.test(t.text))).toBe(false);

    const dense = buildLines(texts).join("\n").replace(/\s+/g, "");

    // SQL code block
    expect(dense).toContain("WITHRECURSIVEleaf_recordsAS(");
    expect(dense).toContain("SELECTr.*FROMBookFileDataV2Recordr");
    expect(dense).toContain("JOINBookFileDataV2RecordTreePathstpONr.id=tp.descendantId");

    // BERT embedding code block
    expect(dense).toContain('model="tohoku-nlp/bert-base-japanese-v3"');
    expect(dense).toContain("tokens=tokenizer.encode(record.text,max_length=512)");
    expect(dense).toContain("embedding=bert(tokens).pooler_output");

    // OpenAI call snippet (appears later in the page)
    expect(dense).toContain("openai.ChatCompletion.create");

    // Ensure the prior mojibake patterns are gone.
    expect(dense).not.toContain("6(/(&7");
    expect(dense).not.toContain("VHUYDQW");
  });
});

