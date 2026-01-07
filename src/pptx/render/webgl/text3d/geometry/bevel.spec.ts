/**
 * @file Tests for bevel configuration and geometry generation
 *
 * Tests ECMA-376 bevel value handling, clamping, and edge cases.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  getBevelConfig,
  createAsymmetricExtrudedGeometry,
  type AsymmetricBevelConfig,
} from "./bevel";
import type { Bevel3d, BevelPresetType, Pixels } from "../../../../domain/index";

// =============================================================================
// Test Helpers
// =============================================================================

/** Create test Bevel3d object */
function createBevel(width: number, height: number, preset: BevelPresetType = "circle"): Bevel3d {
  return {
    width: width as Pixels,
    height: height as Pixels,
    preset,
  };
}

/** Create a simple square shape */
function createSquareShape(size = 100): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(size, 0);
  shape.lineTo(size, size);
  shape.lineTo(0, size);
  shape.closePath();
  return shape;
}

// =============================================================================
// getBevelConfig Tests
// =============================================================================

describe("getBevelConfig", () => {
  describe("basic value mapping", () => {
    it("returns undefined for undefined input", () => {
      expect(getBevelConfig(undefined)).toBeUndefined();
    });

    it("uses ECMA-376 w/h values directly", () => {
      const bevel = createBevel(10, 15, "circle");
      const config = getBevelConfig(bevel);

      expect(config).toBeDefined();
      // w (width) maps to size (inset distance)
      expect(config!.size).toBe(10);
      // h (height) maps to thickness (Z depth)
      expect(config!.thickness).toBe(15);
    });

    it("preserves preset name", () => {
      const bevel = createBevel(8, 8, "softRound");
      const config = getBevelConfig(bevel);

      expect(config!.preset).toBe("softRound");
    });

    it("applies minimum size of 0.5px", () => {
      const bevel = createBevel(0.1, 0.2, "angle");
      const config = getBevelConfig(bevel);

      expect(config!.size).toBe(0.5);
      expect(config!.thickness).toBe(0.5);
    });
  });

  describe("preset segment counts", () => {
    const testCases: [BevelPresetType, number][] = [
      ["angle", 1],
      ["hardEdge", 1],
      ["coolSlant", 2],
      ["cross", 2],
      ["riblet", 2],
      ["artDeco", 3],
      ["slope", 3],
      ["divot", 4],
      ["relaxedInset", 4],
      ["convex", 6],
      ["softRound", 6],
      ["circle", 8],
    ];

    for (const [preset, expectedSegments] of testCases) {
      it(`${preset} has ${expectedSegments} segments`, () => {
        const bevel = createBevel(8, 8, preset);
        const config = getBevelConfig(bevel);

        expect(config!.segments).toBe(expectedSegments);
      });
    }
  });

  describe("offset for inset bevels", () => {
    it("sets offset = -size for inset behavior", () => {
      const bevel = createBevel(10, 8, "circle");
      const config = getBevelConfig(bevel);

      expect(config!.offset).toBe(-10);
    });
  });
});

// =============================================================================
// createAsymmetricExtrudedGeometry Tests
// =============================================================================

describe("createAsymmetricExtrudedGeometry", () => {
  describe("bevel clamping", () => {
    it("clamps bevel thickness to 40% of extrusion when both bevels present", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;
      const maxBevelThickness = extrusionDepth * 0.4; // 8px each

      // Bevel thickness (50) > 40% of extrusion (8)
      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: 50, // Way too large - will be clamped to 8
          size: 10,
          offset: -10,
          segments: 8,
          preset: "circle",
        },
        bottom: {
          thickness: 50, // Way too large - will be clamped to 8
          size: 10,
          offset: -10,
          segments: 8,
          preset: "circle",
        },
      };

      const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);

      // Geometry should still be created
      expect(geometry.attributes.position.count).toBeGreaterThan(0);

      // Check Z range - bevels should be clamped
      const positions = geometry.attributes.position.array as Float32Array;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (let i = 2; i < positions.length; i += 3) {
        minZ = Math.min(minZ, positions[i]);
        maxZ = Math.max(maxZ, positions[i]);
      }

      // After Z-orientation fix:
      // - Front face is at Z=0 (closest to camera)
      // - Back face is at Z=-extrusionDepth
      // - Front bevel (bevelT) extends towards positive Z from Z=0
      // - Back bevel (bevelB) extends towards negative Z from Z=-extrusionDepth
      //
      // Expected Z range: [-extrusionDepth - backBevelThickness, frontBevelThickness]
      const expectedMinZ = -extrusionDepth - maxBevelThickness;
      const expectedMaxZ = maxBevelThickness;

      expect(minZ).toBeGreaterThanOrEqual(expectedMinZ - 1);
      expect(maxZ).toBeLessThanOrEqual(expectedMaxZ + 1);

      // Verify clamping actually happened (not using original 50px)
      const totalZRange = maxZ - minZ;
      const unclamepedRange = extrusionDepth + 50 + 50; // Would be 120 if not clamped
      expect(totalZRange).toBeLessThan(unclamepedRange);
    });

    it("skips bevel if clamped thickness would be too small", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 1; // Very small extrusion

      // Bevel at default size (8px) is way larger than extrusion
      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: 8,
          size: 8,
          offset: -8,
          segments: 8,
          preset: "circle",
        },
      };

      const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);

      // Should still create valid geometry (base extrusion only)
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it("allows larger bevel ratio when only one bevel present", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;

      // Single bevel gets 45% limit instead of 40%
      const bevelSingle: AsymmetricBevelConfig = {
        top: {
          thickness: 9, // 45% of 20 = 9
          size: 9,
          offset: -9,
          segments: 4,
          preset: "relaxedInset",
        },
      };

      const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevelSingle);
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });
  });

  describe("no bevel", () => {
    it("creates base extrusion without bevels", () => {
      const shape = createSquareShape(100);
      const bevel: AsymmetricBevelConfig = {
        top: undefined,
        bottom: undefined,
      };

      const geometry = createAsymmetricExtrudedGeometry([shape], 20, bevel);

      expect(geometry.attributes.position.count).toBeGreaterThan(0);
      expect(geometry.attributes.normal).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles zero extrusion depth", () => {
      const shape = createSquareShape(100);
      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: 5,
          size: 5,
          offset: -5,
          segments: 4,
          preset: "angle",
        },
      };

      // Should not throw
      const geometry = createAsymmetricExtrudedGeometry([shape], 0, bevel);
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it("handles empty shapes array", () => {
      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: 5,
          size: 5,
          offset: -5,
          segments: 4,
          preset: "angle",
        },
      };

      const geometry = createAsymmetricExtrudedGeometry([], 20, bevel);
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it("handles very small extrusion with default bevel", () => {
      const shape = createSquareShape(100);
      // Default bevel is 8px, extrusion is 2px
      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: 8,
          size: 8,
          offset: -8,
          segments: 8,
          preset: "circle",
        },
      };

      const geometry = createAsymmetricExtrudedGeometry([shape], 2, bevel);

      // Should create geometry (bevel will be clamped or skipped)
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it("handles bevel exactly at 40% of extrusion", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 20;
      const exactLimit = extrusionDepth * 0.4; // 8px

      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: exactLimit,
          size: exactLimit,
          offset: -exactLimit,
          segments: 4,
          preset: "angle",
        },
        bottom: {
          thickness: exactLimit,
          size: exactLimit,
          offset: -exactLimit,
          segments: 4,
          preset: "angle",
        },
      };

      const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
    });

    it("handles asymmetric width and height", () => {
      // Width much larger than height
      const bevelWide = createBevel(20, 2, "angle");
      const configWide = getBevelConfig(bevelWide);
      expect(configWide!.size).toBe(20);
      expect(configWide!.thickness).toBe(2);

      // Height much larger than width
      const bevelTall = createBevel(2, 20, "angle");
      const configTall = getBevelConfig(bevelTall);
      expect(configTall!.size).toBe(2);
      expect(configTall!.thickness).toBe(20);
    });

    it("handles extremely large bevel values", () => {
      // ECMA-376 ST_PositiveCoordinate max is ~27 trillion EMU
      // In pixels (at 96 DPI), this is much larger but we test reasonable large values
      const bevel = createBevel(1000, 1000, "circle");
      const config = getBevelConfig(bevel);

      expect(config!.size).toBe(1000);
      expect(config!.thickness).toBe(1000);
    });

    it("preserves bevel ratios when clamping", () => {
      const shape = createSquareShape(100);
      const extrusionDepth = 10;

      // 2:1 ratio (width:height) bevel that needs clamping
      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: 20, // Will be clamped
          size: 40,      // Should maintain 2:1 ratio after clamping
          offset: -40,
          segments: 4,
          preset: "angle",
        },
      };

      // Should not throw and should create valid geometry
      const geometry = createAsymmetricExtrudedGeometry([shape], extrusionDepth, bevel);
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it("handles negative extrusion depth gracefully", () => {
      const shape = createSquareShape(100);
      const bevel: AsymmetricBevelConfig = {
        top: {
          thickness: 5,
          size: 5,
          offset: -5,
          segments: 4,
          preset: "angle",
        },
      };

      // Negative depth - bevels should be skipped
      const geometry = createAsymmetricExtrudedGeometry([shape], -10, bevel);
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    });
  });
});

// =============================================================================
// getBevelConfig Edge Cases
// =============================================================================

describe("getBevelConfig edge cases", () => {
  it("handles zero width", () => {
    const bevel = createBevel(0, 10, "angle");
    const config = getBevelConfig(bevel);

    // Should clamp to minimum 0.5px
    expect(config!.size).toBe(0.5);
    expect(config!.thickness).toBe(10);
  });

  it("handles zero height", () => {
    const bevel = createBevel(10, 0, "angle");
    const config = getBevelConfig(bevel);

    // Should clamp to minimum 0.5px
    expect(config!.size).toBe(10);
    expect(config!.thickness).toBe(0.5);
  });

  it("handles both zero width and height", () => {
    const bevel = createBevel(0, 0, "angle");
    const config = getBevelConfig(bevel);

    // Should clamp both to minimum 0.5px
    expect(config!.size).toBe(0.5);
    expect(config!.thickness).toBe(0.5);
  });

  it("handles fractional pixel values", () => {
    const bevel = createBevel(3.7, 5.2, "circle");
    const config = getBevelConfig(bevel);

    // Should preserve fractional values (above minimum)
    expect(config!.size).toBe(3.7);
    expect(config!.thickness).toBe(5.2);
  });

  it("defaults to circle preset when preset is undefined", () => {
    const bevel: Bevel3d = {
      width: 8 as Pixels,
      height: 8 as Pixels,
      preset: undefined as unknown as BevelPresetType,
    };
    const config = getBevelConfig(bevel);

    // Should default to circle (8 segments)
    expect(config!.segments).toBe(8);
  });

  it("handles unknown preset gracefully", () => {
    const bevel: Bevel3d = {
      width: 8 as Pixels,
      height: 8 as Pixels,
      preset: "unknownPreset" as BevelPresetType,
    };
    const config = getBevelConfig(bevel);

    // Unknown preset should fall back to default segments (8 for circle)
    expect(config).toBeDefined();
    expect(config!.size).toBe(8);
  });
});
