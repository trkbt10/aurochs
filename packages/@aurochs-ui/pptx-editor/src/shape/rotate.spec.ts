/**
 * @file Unit tests for shape/rotate.ts
 */

import {
  normalizeAngle,
  degreesToRadians,
  radiansToDegrees,
  calculateAngleFromCenter,
  snapAngle,
  rotatePointAroundCenter,
  calculateShapeCenter,
  getRotatedCorners,
  getSvgRotationTransform,
  getSvgRotationTransformForBounds,
  rotateShapeAroundCenter,
  calculateRotationDelta,
  DEFAULT_SNAP_ANGLES,
  DEFAULT_SNAP_THRESHOLD,
  type Point,
} from "./rotate";

// =============================================================================
// normalizeAngle Tests
// =============================================================================

describe("normalizeAngle", () => {
  it("returns angle unchanged when in 0-360 range", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(359)).toBe(359);
  });

  it("normalizes negative angles", () => {
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(-360)).toBe(0);
    expect(normalizeAngle(-450)).toBe(270);
  });

  it("normalizes angles above 360", () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(720)).toBe(0);
  });
});

// =============================================================================
// degreesToRadians / radiansToDegrees Tests
// =============================================================================

describe("degreesToRadians", () => {
  it("converts common angles correctly", () => {
    expect(degreesToRadians(0)).toBeCloseTo(0, 10);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10);
  });
});

describe("radiansToDegrees", () => {
  it("converts common angles correctly", () => {
    expect(radiansToDegrees(0)).toBeCloseTo(0, 10);
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 10);
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 10);
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 10);
  });

  it("is inverse of degreesToRadians", () => {
    const angles = [0, 30, 45, 60, 90, 120, 180, 270, 359];
    for (const angle of angles) {
      expect(radiansToDegrees(degreesToRadians(angle))).toBeCloseTo(angle, 10);
    }
  });
});

// =============================================================================
// calculateAngleFromCenter Tests
// =============================================================================

describe("calculateAngleFromCenter", () => {
  it("calculates angle for point to the right", () => {
    const angle = calculateAngleFromCenter({ centerX: 0, centerY: 0, pointX: 10, pointY: 0 });
    expect(angle).toBeCloseTo(0, 5);
  });

  it("calculates angle for point below", () => {
    const angle = calculateAngleFromCenter({ centerX: 0, centerY: 0, pointX: 0, pointY: 10 });
    expect(angle).toBeCloseTo(90, 5);
  });

  it("calculates angle for point to the left", () => {
    const angle = calculateAngleFromCenter({ centerX: 0, centerY: 0, pointX: -10, pointY: 0 });
    expect(angle).toBeCloseTo(180, 5);
  });

  it("calculates angle for point above", () => {
    const angle = calculateAngleFromCenter({ centerX: 0, centerY: 0, pointX: 0, pointY: -10 });
    expect(angle).toBeCloseTo(-90, 5);
  });

  it("handles offset center", () => {
    const angle = calculateAngleFromCenter({ centerX: 100, centerY: 100, pointX: 110, pointY: 100 });
    expect(angle).toBeCloseTo(0, 5);
  });
});

// =============================================================================
// snapAngle Tests
// =============================================================================

describe("snapAngle", () => {
  it("snaps to nearby angle within threshold", () => {
    expect(snapAngle(2)).toBe(0);
    expect(snapAngle(43)).toBe(45);
    expect(snapAngle(92)).toBe(90);
    expect(snapAngle(178)).toBe(180);
  });

  it("does not snap when outside threshold", () => {
    expect(snapAngle(10)).toBe(10);
    expect(snapAngle(30)).toBe(30);
    expect(snapAngle(60)).toBe(60);
  });

  it("snaps near 360/0 boundary", () => {
    expect(snapAngle(358)).toBe(0);
    expect(snapAngle(359)).toBe(0);
  });

  it("uses custom snap angles", () => {
    const customAngles = [0, 30, 60, 90];
    expect(snapAngle(28, customAngles)).toBe(30);
    expect(snapAngle(58, customAngles)).toBe(60);
    expect(snapAngle(45, customAngles)).toBe(45); // not snapped
  });

  it("uses custom threshold", () => {
    expect(snapAngle(43, DEFAULT_SNAP_ANGLES, 1)).toBe(43); // not snapped with threshold 1
    expect(snapAngle(43, DEFAULT_SNAP_ANGLES, 5)).toBe(45); // snapped with threshold 5
  });
});

// =============================================================================
// rotatePointAroundCenter Tests
// =============================================================================

describe("rotatePointAroundCenter", () => {
  it("rotates point 90 degrees", () => {
    const point: Point = { x: 10, y: 0 };
    const center: Point = { x: 0, y: 0 };
    const result = rotatePointAroundCenter(point, center, Math.PI / 2);

    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(10, 10);
  });

  it("rotates point 180 degrees", () => {
    const point: Point = { x: 10, y: 0 };
    const center: Point = { x: 0, y: 0 };
    const result = rotatePointAroundCenter(point, center, Math.PI);

    expect(result.x).toBeCloseTo(-10, 10);
    expect(result.y).toBeCloseTo(0, 10);
  });

  it("rotates point 360 degrees (full circle)", () => {
    const point: Point = { x: 10, y: 5 };
    const center: Point = { x: 0, y: 0 };
    const result = rotatePointAroundCenter(point, center, 2 * Math.PI);

    expect(result.x).toBeCloseTo(10, 10);
    expect(result.y).toBeCloseTo(5, 10);
  });

  it("handles offset center", () => {
    const point: Point = { x: 110, y: 100 };
    const center: Point = { x: 100, y: 100 };
    const result = rotatePointAroundCenter(point, center, Math.PI / 2);

    expect(result.x).toBeCloseTo(100, 10);
    expect(result.y).toBeCloseTo(110, 10);
  });

  it("rotates negative angle", () => {
    const point: Point = { x: 10, y: 0 };
    const center: Point = { x: 0, y: 0 };
    const result = rotatePointAroundCenter(point, center, -Math.PI / 2);

    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(-10, 10);
  });
});

// =============================================================================
// calculateShapeCenter Tests
// =============================================================================

describe("calculateShapeCenter", () => {
  it("calculates center of a shape at origin", () => {
    const center = calculateShapeCenter({ x: 0, y: 0, width: 100, height: 100 });
    expect(center.x).toBe(50);
    expect(center.y).toBe(50);
  });

  it("calculates center of offset shape", () => {
    const center = calculateShapeCenter({ x: 100, y: 200, width: 50, height: 80 });
    expect(center.x).toBe(125);
    expect(center.y).toBe(240);
  });
});

// =============================================================================
// rotateShapeAroundCenter Tests
// =============================================================================

describe("rotateShapeAroundCenter", () => {
  it("rotates shape around external center", () => {
    // Shape at (100, 0) with size 20x20, center at (0, 0), rotate 90 degrees
    const result = rotateShapeAroundCenter({
      shapeX: 90, // x (so center is at 100)
      shapeY: -10, // y (so center is at 0)
      shapeWidth: 20,
      shapeHeight: 20,
      initialRotation: 0,
      combinedCenterX: 0,
      combinedCenterY: 0,
      deltaAngleDeg: 90,
    });

    // Shape center (100, 0) rotates to (0, 100)
    // New top-left: (0 - 10, 100 - 10) = (-10, 90)
    expect(result.x).toBeCloseTo(-10, 5);
    expect(result.y).toBeCloseTo(90, 5);
    expect(result.rotation).toBe(90);
  });

  it("accumulates rotation with initial rotation", () => {
    const result = rotateShapeAroundCenter({
      shapeX: 0,
      shapeY: 0,
      shapeWidth: 100,
      shapeHeight: 100,
      initialRotation: 45,
      combinedCenterX: 50,
      combinedCenterY: 50,
      deltaAngleDeg: 45,
    });

    expect(result.rotation).toBe(90);
  });

  it("normalizes rotation above 360", () => {
    const result = rotateShapeAroundCenter({
      shapeX: 0,
      shapeY: 0,
      shapeWidth: 100,
      shapeHeight: 100,
      initialRotation: 350,
      combinedCenterX: 50,
      combinedCenterY: 50,
      deltaAngleDeg: 20,
    });

    expect(result.rotation).toBe(10);
  });
});

// =============================================================================
// calculateRotationDelta Tests
// =============================================================================

describe("calculateRotationDelta", () => {
  it("calculates delta from start to current angle", () => {
    // Start angle 0 (pointing right), current at 45 degrees
    const delta = calculateRotationDelta({
      centerX: 0,
      centerY: 0,
      currentX: Math.cos(Math.PI / 4) * 10,
      currentY: Math.sin(Math.PI / 4) * 10,
      startAngle: 0,
    });

    expect(delta).toBeCloseTo(45, 5);
  });

  it("calculates negative delta for clockwise rotation", () => {
    // Start angle 90, current at 45
    const delta = calculateRotationDelta({
      centerX: 0,
      centerY: 0,
      currentX: Math.cos(Math.PI / 4) * 10,
      currentY: Math.sin(Math.PI / 4) * 10,
      startAngle: 90,
    });

    expect(delta).toBeCloseTo(-45, 5);
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe("constants", () => {
  it("has correct default snap angles", () => {
    expect(DEFAULT_SNAP_ANGLES).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);
  });

  it("has correct default snap threshold", () => {
    expect(DEFAULT_SNAP_THRESHOLD).toBe(5);
  });
});

// =============================================================================
// getRotatedCorners Tests
// =============================================================================

describe("getRotatedCorners", () => {
  it("returns original corners when rotation is 0", () => {
    const corners = getRotatedCorners({ x: 0, y: 0, width: 100, height: 50, rotation: 0 });

    expect(corners.length).toBe(4);
    expect(corners[0]).toEqual({ x: 0, y: 0 }); // top-left
    expect(corners[1]).toEqual({ x: 100, y: 0 }); // top-right
    expect(corners[2]).toEqual({ x: 100, y: 50 }); // bottom-right
    expect(corners[3]).toEqual({ x: 0, y: 50 }); // bottom-left
  });

  it("rotates corners 90 degrees around center", () => {
    // Rectangle at (0, 0) size 100x100, center at (50, 50)
    const corners = getRotatedCorners({ x: 0, y: 0, width: 100, height: 100, rotation: 90 });

    // After 90 degree rotation:
    // (0, 0) -> rotated around (50, 50) -> (100, 0)
    // (100, 0) -> (100, 100)
    // (100, 100) -> (0, 100)
    // (0, 100) -> (0, 0)
    expect(corners[0].x).toBeCloseTo(100, 5);
    expect(corners[0].y).toBeCloseTo(0, 5);
    expect(corners[1].x).toBeCloseTo(100, 5);
    expect(corners[1].y).toBeCloseTo(100, 5);
    expect(corners[2].x).toBeCloseTo(0, 5);
    expect(corners[2].y).toBeCloseTo(100, 5);
    expect(corners[3].x).toBeCloseTo(0, 5);
    expect(corners[3].y).toBeCloseTo(0, 5);
  });

  it("handles offset rectangle", () => {
    // Rectangle at (100, 200) size 50x30
    const corners = getRotatedCorners({ x: 100, y: 200, width: 50, height: 30, rotation: 0 });

    expect(corners[0]).toEqual({ x: 100, y: 200 });
    expect(corners[1]).toEqual({ x: 150, y: 200 });
    expect(corners[2]).toEqual({ x: 150, y: 230 });
    expect(corners[3]).toEqual({ x: 100, y: 230 });
  });

  it("rotates 180 degrees", () => {
    const corners = getRotatedCorners({ x: 0, y: 0, width: 100, height: 100, rotation: 180 });

    // After 180 degree rotation around (50, 50):
    // (0, 0) -> (100, 100)
    expect(corners[0].x).toBeCloseTo(100, 5);
    expect(corners[0].y).toBeCloseTo(100, 5);
  });
});

// =============================================================================
// getSvgRotationTransform Tests
// =============================================================================

describe("getSvgRotationTransform", () => {
  it("returns undefined for rotation 0", () => {
    expect(getSvgRotationTransform(0, 50, 50)).toBeUndefined();
  });

  it("returns correct transform string for 90 degrees", () => {
    const result = getSvgRotationTransform(90, 50, 100);
    expect(result).toBe("rotate(90, 50, 100)");
  });

  it("returns correct transform string for negative rotation", () => {
    const result = getSvgRotationTransform(-45, 25, 30);
    expect(result).toBe("rotate(-45, 25, 30)");
  });
});

// =============================================================================
// getSvgRotationTransformForBounds Tests
// =============================================================================

describe("getSvgRotationTransformForBounds", () => {
  it("returns undefined for rotation 0", () => {
    expect(getSvgRotationTransformForBounds({ rotation: 0, x: 0, y: 0, width: 100, height: 100 })).toBeUndefined();
  });

  it("calculates center and returns correct transform", () => {
    // Rectangle at (0, 0) size 100x100, center is (50, 50)
    const result = getSvgRotationTransformForBounds({ rotation: 45, x: 0, y: 0, width: 100, height: 100 });
    expect(result).toBe("rotate(45, 50, 50)");
  });

  it("handles offset rectangle", () => {
    // Rectangle at (100, 200) size 50x30, center is (125, 215)
    const result = getSvgRotationTransformForBounds({ rotation: 90, x: 100, y: 200, width: 50, height: 30 });
    expect(result).toBe("rotate(90, 125, 215)");
  });
});
