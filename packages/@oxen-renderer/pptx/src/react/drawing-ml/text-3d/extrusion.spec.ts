/**
 * @file Unit tests for extrusion
 */

import { getExtrusionOffset } from "./extrusion";

// =============================================================================
// getExtrusionOffset Tests
// =============================================================================

describe("getExtrusionOffset", () => {
  const height = 20;
  const depth = height * 0.5; // 10

  it("returns isometric offset for isometricTopUp", () => {
    const result = getExtrusionOffset("isometricTopUp", height);
    expect(result.offsetX).toBe(depth * 0.5);
    expect(result.offsetY).toBe(depth * 0.5);
  });

  it("returns top-left offset for obliqueTopLeft", () => {
    const result = getExtrusionOffset("obliqueTopLeft", height);
    expect(result.offsetX).toBe(-depth);
    expect(result.offsetY).toBe(-depth);
  });

  it("returns top-right offset for obliqueTopRight", () => {
    const result = getExtrusionOffset("obliqueTopRight", height);
    expect(result.offsetX).toBe(depth);
    expect(result.offsetY).toBe(-depth);
  });

  it("returns bottom-left offset for obliqueBottomLeft", () => {
    const result = getExtrusionOffset("obliqueBottomLeft", height);
    expect(result.offsetX).toBe(-depth);
    expect(result.offsetY).toBe(depth);
  });

  it("returns bottom-right offset for obliqueBottomRight", () => {
    const result = getExtrusionOffset("obliqueBottomRight", height);
    expect(result.offsetX).toBe(depth);
    expect(result.offsetY).toBe(depth);
  });

  it("returns top offset for obliqueTop", () => {
    const result = getExtrusionOffset("obliqueTop", height);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(-depth);
  });

  it("returns bottom offset for obliqueBottom", () => {
    const result = getExtrusionOffset("obliqueBottom", height);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(depth);
  });

  it("returns left offset for obliqueLeft", () => {
    const result = getExtrusionOffset("obliqueLeft", height);
    expect(result.offsetX).toBe(-depth);
    expect(result.offsetY).toBe(0);
  });

  it("returns right offset for obliqueRight", () => {
    const result = getExtrusionOffset("obliqueRight", height);
    expect(result.offsetX).toBe(depth);
    expect(result.offsetY).toBe(0);
  });

  it("returns default diagonal offset for unknown camera", () => {
    const result = getExtrusionOffset("unknownCamera", height);
    expect(result.offsetX).toBe(depth * 0.3);
    expect(result.offsetY).toBe(depth * 0.3);
  });

  it("handles perspective cameras", () => {
    expect(getExtrusionOffset("perspectiveAbove", height)).toEqual({
      offsetX: 0,
      offsetY: -depth,
    });
    expect(getExtrusionOffset("perspectiveBelow", height)).toEqual({
      offsetX: 0,
      offsetY: depth,
    });
    expect(getExtrusionOffset("perspectiveLeft", height)).toEqual({
      offsetX: -depth,
      offsetY: 0,
    });
    expect(getExtrusionOffset("perspectiveRight", height)).toEqual({
      offsetX: depth,
      offsetY: 0,
    });
  });
});
