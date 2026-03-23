/** @file Unit tests for OOXML relationship parsing utilities */

import { parseRelationshipsFromText, resolvePartPath } from "./relationships";

describe("ooxml/parser/relationships", () => {
  it("resolvePartPath resolves relative targets", () => {
    expect(resolvePartPath("ppt/slides/slide1.xml", "../media/image1.png")).toBe("ppt/media/image1.png");
    expect(resolvePartPath("ppt/slides/slide1.xml", "slide2.xml")).toBe("ppt/slides/slide2.xml");
  });

  it("parseRelationshipsFromText resolves targets and preserves External", () => {
    const rels = `<?xml version="1.0" encoding="UTF-8"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="t" Target="../media/image1.png" />
        <Relationship Id="rId2" Type="t" Target="https://example.com/x" TargetMode="External" />
      </Relationships>`;

    const map = parseRelationshipsFromText(rels, "ppt/slides/slide1.xml");
    expect(map.getTarget("rId1")).toBe("ppt/media/image1.png");
    expect(map.getTarget("rId2")).toBe("https://example.com/x");
  });
});
