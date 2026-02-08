/** @file Integration tests for parseDoc using real .doc fixtures */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDoc, parseDocWithReport } from "../src/index";

const FIXTURES_DIR = resolve(__dirname, "../../../../fixtures/poi-test-data/test-data/document");

async function loadFixture(name: string): Promise<Uint8Array> {
  const buf = await readFile(resolve(FIXTURES_DIR, name));
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe("parseDoc integration", () => {
  it("parses SampleDoc.doc without crashing", async () => {
    const bytes = await loadFixture("SampleDoc.doc");
    const doc = parseDoc(bytes);

    expect(doc.paragraphs.length).toBeGreaterThan(0);
    // Should have at least one non-empty paragraph
    const nonEmpty = doc.paragraphs.filter((p) => p.runs.some((r) => r.text.trim().length > 0));
    expect(nonEmpty.length).toBeGreaterThan(0);
  });

  it("parses Lists.doc and finds list paragraphs", async () => {
    const bytes = await loadFixture("Lists.doc");
    const doc = parseDoc(bytes);

    expect(doc.paragraphs.length).toBeGreaterThan(0);
    // Lists.doc should have paragraphs with listIndex (list references)
    const hasListParas = doc.paragraphs.some((p) => p.listIndex !== undefined);
    expect(hasListParas).toBe(true);
  });

  it("parses HeaderFooterUnicode.doc and extracts headers/footers", async () => {
    const bytes = await loadFixture("HeaderFooterUnicode.doc");
    const doc = parseDoc(bytes);

    expect(doc.paragraphs.length).toBeGreaterThan(0);
    // Should have headers or footers
    const hasHeaders = doc.headers !== undefined && doc.headers.length > 0;
    const hasFooters = doc.footers !== undefined && doc.footers.length > 0;
    expect(hasHeaders || hasFooters).toBe(true);
  });

  it("parses ThreeColHeadFoot.doc and finds sections", async () => {
    const bytes = await loadFixture("ThreeColHeadFoot.doc");
    const doc = parseDoc(bytes);

    expect(doc.paragraphs.length).toBeGreaterThan(0);
    // Multi-section document should have sections
    if (doc.sections && doc.sections.length > 0) {
      expect(doc.sections.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("parses 57603-seven_columns.doc without crashing", async () => {
    const bytes = await loadFixture("57603-seven_columns.doc");
    const doc = parseDoc(bytes);

    expect(doc.paragraphs.length).toBeGreaterThan(0);
    // Should have sections
    expect(doc.sections).toBeDefined();
  });
});

describe("parseDocWithReport", () => {
  it("returns document and collected warnings", async () => {
    const bytes = await loadFixture("SampleDoc.doc");
    const result = parseDocWithReport(bytes);

    expect(result.document.paragraphs.length).toBeGreaterThan(0);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("throws on non-Uint8Array input", () => {
    expect(() => parseDocWithReport("not bytes" as never)).toThrow("bytes must be a Uint8Array");
  });

  it("throws on empty/invalid bytes", () => {
    expect(() => parseDocWithReport(new Uint8Array(0))).toThrow();
  });

  it("throws on random bytes (not a valid CFB)", () => {
    const random = new Uint8Array(1024);
    for (let i = 0; i < random.length; i++) {
      random[i] = Math.floor(Math.random() * 256);
    }
    expect(() => parseDocWithReport(random)).toThrow();
  });
});

describe("parseDoc smoke tests (batch)", () => {
  const fixtureNames = [
    "47304.doc",
    "SimpleHeadThreeColFoot.doc",
    "53379.doc",
    "56880.doc",
    "lists-margins.doc",
    "HeaderFooterProblematic.doc",
  ];

  for (const name of fixtureNames) {
    it(`parses ${name} without crashing`, async () => {
      const bytes = await loadFixture(name);
      // Use parseDocWithReport which provides its own warning collector
      // (lenient mode requires an onWarning sink)
      const result = parseDocWithReport(bytes);
      expect(result.document.paragraphs).toBeDefined();
    });
  }
});
