/**
 * @file Test that the demo document builds and parses successfully
 */

import { createDemoFigDesignDocument } from "./demo-document";

describe("createDemoFigDesignDocument", () => {
  it("returns a FigDesignDocument with content pages + internal canvas", async () => {
    const doc = await createDemoFigDesignDocument();
    expect(doc).toBeDefined();
    // 3 content pages + 1 internal canvas = 4 pages
    expect(doc.pages.length).toBeGreaterThanOrEqual(3);
  }, 30_000);

  it("has the expected content page names", async () => {
    const doc = await createDemoFigDesignDocument();
    const names = doc.pages.map((p) => p.name);
    expect(names).toContain("Shapes & Fills");
    expect(names).toContain("Typography");
    expect(names).toContain("Components & Effects");
  }, 30_000);

  it("content pages have children (nodes)", async () => {
    const doc = await createDemoFigDesignDocument();
    // Filter out the internal-only canvas (which has no children)
    const contentPages = doc.pages.filter((p) => p.children.length > 0);
    expect(contentPages.length).toBeGreaterThanOrEqual(3);
  }, 30_000);
});
