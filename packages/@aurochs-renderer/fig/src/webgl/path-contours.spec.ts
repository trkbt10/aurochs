/** @file SVG path contour helper tests */

import { tessellateContours } from "./tessellation";
import { svgPathDToContours } from "./path-contours";

describe("svgPathDToContours", () => {
  it("splits independent M...Z subpaths", () => {
    const contours = svgPathDToContours({
      d: "M 0 0 L 10 0 L 10 10 Z M 20 0 L 30 0 L 30 10 Z",
    });

    expect(contours).toHaveLength(2);
    expect(contours[0].commands[0].type).toBe("M");
    expect(contours[1].commands[0].type).toBe("M");
  });

  it("lets overlapping glyph-like subpaths tessellate independently", () => {
    const contours = svgPathDToContours({
      d: [
        "M 0 0 L 14 0 L 14 20 L 0 20 Z",
        "M 10 0 L 24 0 L 24 20 L 10 20 Z",
      ].join(" "),
    });

    const vertices = tessellateContours(contours, 0.25, true);

    expect(contours).toHaveLength(2);
    expect(vertices.length).toBe(24);
  });

  it("preserves outer and hole subpaths for glyph counters", () => {
    const contours = svgPathDToContours({
      d: [
        "M 0 0 L 30 0 L 30 30 L 0 30 Z",
        "M 10 10 L 10 20 L 20 20 L 20 10 Z",
      ].join(" "),
    });

    const vertices = tessellateContours(contours, 0.25, true);

    expect(contours).toHaveLength(2);
    expect(vertices.length).toBeGreaterThan(0);
    for (let i = 0; i < vertices.length; i += 2) {
      const x = vertices[i];
      const y = vertices[i + 1];
      expect(x > 10 && x < 20 && y > 10 && y < 20).toBe(false);
    }
  });
});
