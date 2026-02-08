/**
 * @file Group node builder unit tests
 */

import { groupNode } from "./group-builder";

describe("GroupNodeBuilder", () => {
  it("creates basic group with defaults", () => {
    const result = groupNode(1, 0).build();

    expect(result.localID).toBe(1);
    expect(result.parentID).toBe(0);
    expect(result.name).toBe("Group");
    expect(result.visible).toBe(true);
    expect(result.opacity).toBe(1);
    expect(result.size).toBeUndefined(); // Groups auto-size by default
  });

  it("creates group with custom properties", () => {
    const result = groupNode(2, 1)
      .name("My Group")
      .size(200, 150)
      .position(10, 20)
      .build();

    expect(result.name).toBe("My Group");
    expect(result.size).toEqual({ x: 200, y: 150 });
    expect(result.transform.m02).toBe(10);
    expect(result.transform.m12).toBe(20);
  });

  it("applies rotation transform", () => {
    const result = groupNode(1, 0).rotation(90).build();

    const rad = (90 * Math.PI) / 180;
    expect(result.transform.m00).toBeCloseTo(Math.cos(rad));
    expect(result.transform.m01).toBeCloseTo(-Math.sin(rad));
  });
});
