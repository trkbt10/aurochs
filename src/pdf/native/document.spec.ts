import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadNativePdfDocument } from "./document";

describe("NativePdfDocument", () => {
  it("loads pdf-lib fixtures (xref stream + objstm)", () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/simple-rect.pdf"));
    const doc = loadNativePdfDocument(bytes, { encryption: "reject" });

    expect(doc.getPageCount()).toBe(1);

    const page = doc.getPages()[0];
    expect(page).toBeDefined();

    const size = page!.getSize();
    expect(Math.round(size.width)).toBe(612);
    expect(Math.round(size.height)).toBe(792);

    const contents = page!.getDecodedContentStreams();
    expect(contents.length).toBeGreaterThan(0);
    const contentText = new TextDecoder("latin1").decode(contents[0]);
    // pdf-lib output should contain path construction + painting operators.
    expect(contentText).toMatch(/\bm\b/);
    expect(contentText).toMatch(/\bB\b/);
  });

  it("loads xref-table fixtures", () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/ccitt-group4.pdf"));
    const doc = loadNativePdfDocument(bytes, { encryption: "reject" });
    expect(doc.getPageCount()).toBe(1);

    const page = doc.getPages()[0]!;
    const contents = page.getDecodedContentStreams();
    expect(contents.length).toBe(1);
    const contentText = new TextDecoder("latin1").decode(contents[0]);
    expect(contentText).toContain("/Im1");
    expect(contentText).toMatch(/\bDo\b/);
  });
});
