/**
 * @file Tests for bevel configuration
 *
 * Tests ECMA-376 bevel preset configuration mapping.
 * For geometry generation tests, see ./bevel/*.spec.ts
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */

import { getBevelConfig, getAsymmetricBevelConfig } from "./bevel";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import type { Bevel3d, BevelPresetType, Shape3d } from "@oxen-office/pptx/domain/index";

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

/** Create test Shape3d with bevels */
function createShape3d(
  bevelTop?: Bevel3d,
  bevelBottom?: Bevel3d,
): Shape3d {
  return {
    bevelTop,
    bevelBottom,
  } as Shape3d;
}

// =============================================================================
// getBevelConfig Tests
// =============================================================================

describe("getBevelConfig", () => {
  describe("basic value mapping", () => {
    it("returns undefined for undefined input", () => {
      expect(getBevelConfig(undefined)).toBeUndefined();
    });

    it("uses baseSize = min(width, height) for calculations", () => {
      // When width < height
      const bevelWide = createBevel(10, 15, "circle");
      const configWide = getBevelConfig(bevelWide);
      expect(configWide).toBeDefined();
      // For circle preset, thickness = baseSize * 1.0, size = baseSize * 1.0
      expect(configWide!.thickness).toBe(10); // min(10, 15) * 1.0
      expect(configWide!.size).toBe(10);

      // When height < width
      const bevelTall = createBevel(20, 8, "circle");
      const configTall = getBevelConfig(bevelTall);
      expect(configTall!.thickness).toBe(8); // min(20, 8) * 1.0
      expect(configTall!.size).toBe(8);
    });

    it("returns correct segment count for circle preset", () => {
      const bevel = createBevel(10, 10, "circle");
      const config = getBevelConfig(bevel);

      expect(config!.segments).toBe(8);
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

  describe("preset multipliers", () => {
    const baseSize = 10;

    it("angle: thickness=0.5x, size=1.0x", () => {
      const config = getBevelConfig(createBevel(baseSize, baseSize, "angle"));
      expect(config!.thickness).toBe(5);
      expect(config!.size).toBe(10);
    });

    it("artDeco: thickness=0.8x, size=0.6x", () => {
      const config = getBevelConfig(createBevel(baseSize, baseSize, "artDeco"));
      expect(config!.thickness).toBe(8);
      expect(config!.size).toBe(6);
    });

    it("circle: thickness=1.0x, size=1.0x", () => {
      const config = getBevelConfig(createBevel(baseSize, baseSize, "circle"));
      expect(config!.thickness).toBe(10);
      expect(config!.size).toBe(10);
    });

    it("convex: thickness=1.2x, size=0.8x", () => {
      const config = getBevelConfig(createBevel(baseSize, baseSize, "convex"));
      expect(config!.thickness).toBe(12);
      expect(config!.size).toBe(8);
    });

    it("coolSlant: thickness=0.4x, size=1.2x", () => {
      const config = getBevelConfig(createBevel(baseSize, baseSize, "coolSlant"));
      expect(config!.thickness).toBe(4);
      expect(config!.size).toBe(12);
    });

    it("divot: thickness=0.3x, size=0.5x", () => {
      const config = getBevelConfig(createBevel(baseSize, baseSize, "divot"));
      expect(config!.thickness).toBe(3);
      expect(config!.size).toBe(5);
    });

    it("hardEdge: thickness=0.2x, size=0.3x", () => {
      const config = getBevelConfig(createBevel(baseSize, baseSize, "hardEdge"));
      expect(config!.thickness).toBe(2);
      expect(config!.size).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("handles zero width", () => {
      const bevel = createBevel(0, 10, "angle");
      const config = getBevelConfig(bevel);

      // baseSize = min(0, 10) = 0
      expect(config!.thickness).toBe(0);
      expect(config!.size).toBe(0);
    });

    it("handles zero height", () => {
      const bevel = createBevel(10, 0, "angle");
      const config = getBevelConfig(bevel);

      // baseSize = min(10, 0) = 0
      expect(config!.thickness).toBe(0);
      expect(config!.size).toBe(0);
    });

    it("handles fractional pixel values", () => {
      const bevel = createBevel(3.7, 5.2, "circle");
      const config = getBevelConfig(bevel);

      // baseSize = min(3.7, 5.2) = 3.7
      expect(config!.thickness).toBe(3.7);
      expect(config!.size).toBe(3.7);
    });

    it("handles unknown preset with default segments", () => {
      const bevel: Bevel3d = {
        width: 8 as Pixels,
        height: 8 as Pixels,
        preset: "unknownPreset" as BevelPresetType,
      };
      const config = getBevelConfig(bevel);

      // Unknown preset falls through to default case
      expect(config).toBeDefined();
      expect(config!.segments).toBe(3); // default segments
    });
  });
});

// =============================================================================
// getAsymmetricBevelConfig Tests
// =============================================================================

describe("getAsymmetricBevelConfig", () => {
  it("returns empty config for undefined shape3d", () => {
    const config = getAsymmetricBevelConfig(undefined);

    expect(config.top).toBeUndefined();
    expect(config.bottom).toBeUndefined();
  });

  it("returns empty config for shape3d without bevels", () => {
    const shape3d = createShape3d(undefined, undefined);
    const config = getAsymmetricBevelConfig(shape3d);

    expect(config.top).toBeUndefined();
    expect(config.bottom).toBeUndefined();
  });

  it("returns top bevel only when only bevelTop is set", () => {
    const topBevel = createBevel(10, 10, "circle");
    const shape3d = createShape3d(topBevel, undefined);
    const config = getAsymmetricBevelConfig(shape3d);

    expect(config.top).toBeDefined();
    expect(config.top!.thickness).toBe(10);
    expect(config.top!.size).toBe(10);
    expect(config.top!.segments).toBe(8);
    expect(config.bottom).toBeUndefined();
  });

  it("returns bottom bevel only when only bevelBottom is set", () => {
    const bottomBevel = createBevel(8, 8, "angle");
    const shape3d = createShape3d(undefined, bottomBevel);
    const config = getAsymmetricBevelConfig(shape3d);

    expect(config.top).toBeUndefined();
    expect(config.bottom).toBeDefined();
    expect(config.bottom!.segments).toBe(1); // angle has 1 segment
  });

  it("returns both bevels when both are set", () => {
    const topBevel = createBevel(10, 10, "circle");
    const bottomBevel = createBevel(5, 5, "angle");
    const shape3d = createShape3d(topBevel, bottomBevel);
    const config = getAsymmetricBevelConfig(shape3d);

    expect(config.top).toBeDefined();
    expect(config.bottom).toBeDefined();
    expect(config.top!.segments).toBe(8); // circle
    expect(config.bottom!.segments).toBe(1); // angle
  });

  it("returns asymmetric configs when bevels differ", () => {
    const topBevel = createBevel(20, 20, "softRound");
    const bottomBevel = createBevel(5, 5, "hardEdge");
    const shape3d = createShape3d(topBevel, bottomBevel);
    const config = getAsymmetricBevelConfig(shape3d);

    // Top: softRound with baseSize=20
    expect(config.top!.thickness).toBe(18); // 20 * 0.9
    expect(config.top!.size).toBe(18); // 20 * 0.9
    expect(config.top!.segments).toBe(6);

    // Bottom: hardEdge with baseSize=5
    expect(config.bottom!.thickness).toBe(1); // 5 * 0.2
    expect(config.bottom!.size).toBe(1.5); // 5 * 0.3
    expect(config.bottom!.segments).toBe(1);
  });
});
