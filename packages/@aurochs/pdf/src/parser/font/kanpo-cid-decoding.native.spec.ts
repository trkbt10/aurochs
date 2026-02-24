/**
 * @file Regression checks for CID Identity font decoding in Kanpo PDFs.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePdf } from "../core/pdf-parser";

function isPrivateUse(text: string): boolean {
  return Array.from(text).some((char) => {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      return false;
    }
    return (
      (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
      (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
      (codePoint >= 0x100000 && codePoint <= 0x10fffd)
    );
  });
}

function fixturePath(name: string): string {
  return join(__dirname, "../../../fixtures/block-segmentation-corpus", name);
}

async function countMojibakeRuns(pdfName: string): Promise<Readonly<{ replacementRuns: number; puaRuns: number; textRuns: number }>> {
  const bytes = readFileSync(fixturePath(pdfName));
  const doc = await parsePdf(bytes, {
    pages: [1],
    encryption: { mode: "password", password: "" },
  });
  const page = doc.pages[0];
  if (!page) {
    throw new Error(`failed to parse page 1 for fixture: ${pdfName}`);
  }
  const texts = page.elements.filter((element) => element.type === "text");
  return {
    replacementRuns: texts.filter((text) => text.text.includes("\uFFFD")).length,
    puaRuns: texts.filter((text) => isPrivateUse(text.text)).length,
    textRuns: texts.length,
  };
}

describe("Kanpo CID decoding regression", () => {
  // Note:
  // These fixtures embed CIDFontType0C fonts with ROS=Adobe-Identity and ToUnicode entries
  // mapped to U+FFFD/PUA. In this case, CID ordering inference is intentionally disabled to
  // avoid false-positive "decoded" garbage text. Replacement runs remain, but are explicit.
  const cases = [
    {
      name: "20260219c000320001.pdf",
      maxReplacementRuns: 180,
      maxPuaRuns: 4,
    },
    {
      name: "20260219g000350002.pdf",
      maxReplacementRuns: 220,
      maxPuaRuns: 1,
    },
    {
      name: "20260219h016500001.pdf",
      maxReplacementRuns: 340,
      maxPuaRuns: 1,
    },
    {
      name: "20241224jokenhenko.pdf",
      maxReplacementRuns: 0,
      maxPuaRuns: 0,
    },
  ] as const;

  it.each(cases)("limits mojibake runs for $name", async ({ name, maxReplacementRuns, maxPuaRuns }) => {
    const counts = await countMojibakeRuns(name);
    expect(counts.textRuns).toBeGreaterThan(0);
    expect(counts.replacementRuns).toBeLessThanOrEqual(maxReplacementRuns);
    expect(counts.puaRuns).toBeLessThanOrEqual(maxPuaRuns);
  });
});
