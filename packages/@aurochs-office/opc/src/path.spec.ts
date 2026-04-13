/** @file Tests for OPC POSIX path utilities */
import { buildRelativeTarget, getRelationshipPartPath, isAbsoluteIri } from "./path";
import { resolveRelationshipTargetPath } from "./relationship-target";

// =============================================================================
// buildRelativeTarget
// =============================================================================

describe("buildRelativeTarget", () => {
  it("returns filename only for same-directory parts", () => {
    expect(buildRelativeTarget("xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml")).toBe("sheet2.xml");
  });

  it("produces parent-directory reference for sibling directories", () => {
    expect(buildRelativeTarget("xl/worksheets/sheet1.xml", "xl/drawings/drawing1.xml")).toBe("../drawings/drawing1.xml");
  });

  it("produces multiple parent references for deeper nesting", () => {
    expect(buildRelativeTarget("xl/worksheets/sub/deep/sheet1.xml", "xl/media/image1.png")).toBe("../../../media/image1.png");
  });

  it("handles target in deeper directory than source", () => {
    expect(buildRelativeTarget("xl/workbook.xml", "xl/worksheets/sheet1.xml")).toBe("worksheets/sheet1.xml");
  });

  it("is inverse of resolveRelationshipTargetPath for typical cases", () => {
    const source = "xl/worksheets/sheet1.xml";
    const target = "xl/drawings/drawing1.xml";
    const relative = buildRelativeTarget(source, target);
    const resolved = resolveRelationshipTargetPath(source, relative);
    expect(resolved).toBe(target);
  });

  it("roundtrips through resolve for same-directory parts", () => {
    const source = "xl/worksheets/sheet1.xml";
    const target = "xl/worksheets/sheet2.xml";
    const relative = buildRelativeTarget(source, target);
    expect(resolveRelationshipTargetPath(source, relative)).toBe(target);
  });

  it("roundtrips through resolve for deeply nested parts", () => {
    const source = "ppt/slides/slide1.xml";
    const target = "ppt/media/image1.png";
    const relative = buildRelativeTarget(source, target);
    expect(resolveRelationshipTargetPath(source, relative)).toBe(target);
  });

  it("throws on empty sourcePart", () => {
    expect(() => buildRelativeTarget("", "xl/media/image1.png")).toThrow("must not be empty");
  });

  it("throws on empty targetPart", () => {
    expect(() => buildRelativeTarget("xl/worksheets/sheet1.xml", "")).toThrow("must not be empty");
  });

  it("throws on backslash in sourcePart", () => {
    expect(() => buildRelativeTarget("xl\\worksheets\\sheet1.xml", "xl/media/image1.png")).toThrow("backslash");
  });

  it("throws on null byte in targetPart", () => {
    expect(() => buildRelativeTarget("xl/worksheets/sheet1.xml", "xl/media/\0image1.png")).toThrow("null");
  });
});

// =============================================================================
// getRelationshipPartPath
// =============================================================================

describe("getRelationshipPartPath", () => {
  it("computes rels path for a nested part", () => {
    expect(getRelationshipPartPath("xl/worksheets/sheet1.xml")).toBe("xl/worksheets/_rels/sheet1.xml.rels");
  });

  it("computes rels path for a root-level part", () => {
    expect(getRelationshipPartPath("xl/workbook.xml")).toBe("xl/_rels/workbook.xml.rels");
  });

  it("computes rels path for a top-level file without directory", () => {
    expect(getRelationshipPartPath("[Content_Types].xml")).toBe("_rels/[Content_Types].xml.rels");
  });

  it("throws on empty path", () => {
    expect(() => getRelationshipPartPath("")).toThrow("must not be empty");
  });

  it("throws on backslash", () => {
    expect(() => getRelationshipPartPath("xl\\worksheets\\sheet1.xml")).toThrow("backslash");
  });
});

// =============================================================================
// isAbsoluteIri
// =============================================================================

describe("isAbsoluteIri", () => {
  it("detects http scheme", () => {
    expect(isAbsoluteIri("http://example.com")).toBe(true);
  });

  it("detects https scheme", () => {
    expect(isAbsoluteIri("https://example.com")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isAbsoluteIri("../media/image1.png")).toBe(false);
  });

  it("returns false for absolute package paths", () => {
    expect(isAbsoluteIri("/xl/media/image1.png")).toBe(false);
  });
});
