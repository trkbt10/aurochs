/**
 * @file Tests for shared document loader (supports .docx and .doc)
 */

import { resolve } from "node:path";
import { loadDocument } from "./loader";

const FIXTURES = resolve(import.meta.dirname, "../../../../../fixtures/poi-test-data/test-data/document");

describe("loadDocument", () => {
  it("should load a .docx file", async () => {
    const doc = await loadDocument(resolve(FIXTURES, "SampleDoc.docx"));
    expect(doc.body).toBeDefined();
    expect(doc.body.content.length).toBeGreaterThan(0);
  });

  // Skipped: @oxen-office/docx/exporter depends on ./serializer/* which does not exist yet
  it.skip("should load a .doc file via conversion", async () => {
    const doc = await loadDocument(resolve(FIXTURES, "SampleDoc.doc"));
    expect(doc.body).toBeDefined();
    expect(doc.body.content.length).toBeGreaterThan(0);
  });

  it("should throw for non-existent file", async () => {
    await expect(loadDocument("/nonexistent/file.docx")).rejects.toThrow();
  });
});
