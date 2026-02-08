/**
 * @file Section node builder unit tests
 */

import { sectionNode } from "./section-builder";

describe("SectionNodeBuilder", () => {
  it("creates basic section with defaults", () => {
    const result = sectionNode(1, 0).build();

    expect(result.localID).toBe(1);
    expect(result.parentID).toBe(0);
    expect(result.name).toBe("Section");
    expect(result.size).toEqual({ x: 800, y: 600 });
    expect(result.visible).toBe(true);
    expect(result.opacity).toBe(1);
    expect(result.sectionContentsHidden).toBeUndefined();
  });

  it("creates section with custom properties", () => {
    const result = sectionNode(2, 1)
      .name("My Section")
      .size(1000, 800)
      .position(100, 200)
      .build();

    expect(result.name).toBe("My Section");
    expect(result.size).toEqual({ x: 1000, y: 800 });
    expect(result.transform.m02).toBe(100);
    expect(result.transform.m12).toBe(200);
  });

  it("sets contents hidden", () => {
    const result = sectionNode(1, 0).contentsHidden(true).build();

    expect(result.sectionContentsHidden).toBe(true);
  });
});
