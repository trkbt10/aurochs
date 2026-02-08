/**
 * @file Rounded rectangle node builder unit tests
 */

import { roundedRectNode } from "./rounded-rectangle";
import { SHAPE_NODE_TYPES } from "../../constants";

describe("RoundedRectangleNodeBuilder", () => {
  it("creates basic rectangle with defaults", () => {
    const result = roundedRectNode(1, 0).build();

    expect(result.nodeType).toBe(SHAPE_NODE_TYPES.ROUNDED_RECTANGLE);
    expect(result.name).toBe("Rectangle");
    expect(result.cornerRadius).toBeUndefined();
    expect(result.rectangleCornerRadii).toBeUndefined();
  });

  it("creates rectangle with uniform corner radius", () => {
    const result = roundedRectNode(2, 1)
      .name("Rounded Rect")
      .cornerRadius(8)
      .size(100, 50)
      .build();

    expect(result.cornerRadius).toBe(8);
    expect(result.rectangleCornerRadii).toBeUndefined();
  });

  it("creates rectangle with individual corner radii", () => {
    const result = roundedRectNode(3, 1)
      .corners([4, 8, 12, 16])
      .build();

    expect(result.cornerRadius).toBeUndefined();
    expect(result.rectangleCornerRadii).toEqual([4, 8, 12, 16]);
  });

  it("individual corners override uniform radius", () => {
    const result = roundedRectNode(4, 1)
      .cornerRadius(8)
      .corners([0, 8, 0, 8])
      .build();

    expect(result.cornerRadius).toBeUndefined();
    expect(result.rectangleCornerRadii).toEqual([0, 8, 0, 8]);
  });
});
