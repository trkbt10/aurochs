/**
 * @file fill-utils unit tests
 */

import { createDefaultColor, createDefaultFill, getHexFromColor, getStopHex } from "./fill-utils";

describe("fill-utils", () => {
  it("creates default fills by type", () => {
    expect(createDefaultFill("noFill")).toEqual({ type: "noFill" });

    const solid = createDefaultFill("solidFill");
    expect(solid.type).toBe("solidFill");
    if (solid.type === "solidFill") {
      expect(getHexFromColor(solid.color)).toBe("000000");
    }

    const gradient = createDefaultFill("gradientFill");
    expect(gradient.type).toBe("gradientFill");
    if (gradient.type === "gradientFill") {
      expect(gradient.stops.length).toBeGreaterThanOrEqual(2);
      expect(gradient.stops[0].position).toBe(0);
      expect(getStopHex(gradient.stops[0])).toBe("000000");
    }
  });

  it("creates default sRGB color", () => {
    const c = createDefaultColor("ABCDEF");
    expect(c.spec.type).toBe("srgb");
    if (c.spec.type === "srgb") {
      expect(c.spec.value).toBe("ABCDEF");
    }
  });
});
