/**
 * @file Line node builder unit tests
 */

import { lineNode } from "./line";
import { SHAPE_NODE_TYPES } from "../../constants";

describe("LineNodeBuilder", () => {
  it("creates basic line with defaults", () => {
    const result = lineNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.LINE);
    expect(result.name).toBe("Line");
    expect(result.fillPaints).toHaveLength(0); // lines have no fill by default
    expect(result.strokePaints).toHaveLength(1);
    expect(result.strokeWeight).toBe(1);
  });

  it("creates line with custom length and stroke", () => {
    const result = lineNode(2, 1)
      .name("Divider")
      .length(200)
      .position(50, 100)
      .stroke({ r: 0.5, g: 0.5, b: 0.5, a: 1 })
      .strokeWeight(2)
      .dashPattern([5, 3])
      .build();

    expect(result.name).toBe("Divider");
    expect(result.size.x).toBe(200);
    expect(result.size.y).toBe(0); // lines have 0 height
    expect(result.strokeWeight).toBe(2);
    expect(result.dashPattern).toEqual([5, 3]);
  });

  it("creates line with arrow caps", () => {
    const result = lineNode(3, 1)
      .strokeCap("ARROW_EQUILATERAL")
      .build();

    expect(result.strokeCap).toEqual({ value: 4, name: "ARROW_EQUILATERAL" });
  });
});
