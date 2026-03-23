/** @file Tests for OPC POSIX path utilities */
import { buildRelativeTarget } from "./path";

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

  it("is inverse of resolveRelationshipTargetPath for typical cases", async () => {
    const { resolveRelationshipTargetPath } = await import("./relationship-target");
    const source = "xl/worksheets/sheet1.xml";
    const target = "xl/drawings/drawing1.xml";
    const relative = buildRelativeTarget(source, target);
    const resolved = resolveRelationshipTargetPath(source, relative);
    expect(resolved).toBe(target);
  });

  it("roundtrips through resolve for same-directory parts", async () => {
    const { resolveRelationshipTargetPath } = await import("./relationship-target");
    const source = "xl/worksheets/sheet1.xml";
    const target = "xl/worksheets/sheet2.xml";
    const relative = buildRelativeTarget(source, target);
    expect(resolveRelationshipTargetPath(source, relative)).toBe(target);
  });

  it("roundtrips through resolve for deeply nested parts", async () => {
    const { resolveRelationshipTargetPath } = await import("./relationship-target");
    const source = "ppt/slides/slide1.xml";
    const target = "ppt/media/image1.png";
    const relative = buildRelativeTarget(source, target);
    expect(resolveRelationshipTargetPath(source, relative)).toBe(target);
  });
});
