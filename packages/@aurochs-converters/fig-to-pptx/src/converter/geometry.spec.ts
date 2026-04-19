/**
 * @file Geometry conversion tests — FRAME decoration preservation
 *
 * Regression guards for FRAME cornerRadius: before these were added, a FRAME
 * with .cornerRadius(16).background(white) emitted a sharp-cornered `rect`
 * preset in PPTX because the FRAME case always returned `createPreset("rect")`
 * regardless of corner radius.
 */

import { convertGeometry } from "./geometry";
import type { FigDesignNode, FigNodeId, FigPaint } from "@aurochs/fig/domain";

const WHITE_PAINT: FigPaint = {
  type: "SOLID",
  color: { r: 1, g: 1, b: 1, a: 1 },
  opacity: 1,
  visible: true,
};

function frameNode(partial: Partial<FigDesignNode> = {}): FigDesignNode {
  return {
    id: "1:1" as FigNodeId,
    parentId: null,
    type: "FRAME",
    name: "Frame",
    visible: true,
    opacity: 1,
    blendMode: "NORMAL",
    locked: false,
    absoluteBoundingBox: null,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 100, y: 80 },
    fills: [WHITE_PAINT],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    children: [],
    ...partial,
  };
}

describe("convertGeometry — FRAME", () => {
  it("FRAME with uniform cornerRadius emits roundRect preset", () => {
    const geo = convertGeometry(frameNode({ cornerRadius: 16 }));
    expect(geo?.type).toBe("preset");
    if (geo?.type === "preset") {
      expect(geo.preset).toBe("roundRect");
    }
  });

  it("FRAME with individual rectangleCornerRadii emits rounded geometry", () => {
    const geo = convertGeometry(frameNode({ rectangleCornerRadii: [10, 20, 10, 20] }));
    expect(geo?.type).toBe("preset");
    if (geo?.type === "preset") {
      // Non-uniform corners produce a distinct preset (round2SameRect/snip2SameRect/etc.)
      expect(geo.preset).not.toBe("rect");
    }
  });

  it("FRAME without corner radius emits plain rect", () => {
    const geo = convertGeometry(frameNode({ cornerRadius: 0 }));
    expect(geo?.type).toBe("preset");
    if (geo?.type === "preset") {
      expect(geo.preset).toBe("rect");
    }
  });

  it("FRAME with no fills/strokes returns undefined (no geometry needed)", () => {
    const geo = convertGeometry(frameNode({ fills: [], strokes: [], cornerRadius: 16 }));
    expect(geo).toBeUndefined();
  });

  it("INSTANCE with cornerRadius honours corner radius like FRAME", () => {
    const geo = convertGeometry(frameNode({ type: "INSTANCE", cornerRadius: 8 }));
    expect(geo?.type).toBe("preset");
    if (geo?.type === "preset") {
      expect(geo.preset).toBe("roundRect");
    }
  });

  it("COMPONENT with cornerRadius honours corner radius like FRAME", () => {
    const geo = convertGeometry(frameNode({ type: "COMPONENT", cornerRadius: 12 }));
    expect(geo?.type).toBe("preset");
    if (geo?.type === "preset") {
      expect(geo.preset).toBe("roundRect");
    }
  });
});
