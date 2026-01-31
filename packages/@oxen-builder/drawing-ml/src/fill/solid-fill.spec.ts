/**
 * @file Solid fill builder tests
 */

import { buildColor, buildSolidFill, buildSolidFillFromSpec, buildThemeFill } from "./solid-fill";

describe("solid-fill", () => {
  describe("buildColor", () => {
    it("builds color from hex string", () => {
      const color = buildColor("FF0000");
      expect(color).toEqual({
        spec: { type: "srgb", value: "FF0000" },
      });
    });

    it("builds color from theme spec", () => {
      const color = buildColor({ theme: "accent1" });
      expect(color).toEqual({
        spec: { type: "scheme", value: "accent1" },
        transform: undefined,
      });
    });

    it("builds color with luminance modifiers", () => {
      const color = buildColor({ theme: "accent1", lumMod: 50, lumOff: 10 });
      expect(color.spec).toEqual({ type: "scheme", value: "accent1" });
      expect(color.transform).toEqual({
        lumMod: 50000,
        lumOff: 10000,
      });
    });

    it("builds color with tint and shade", () => {
      const color = buildColor({ theme: "dk1", tint: 80, shade: 20 });
      expect(color.transform).toEqual({
        tint: 80000,
        shade: 20000,
      });
    });
  });

  describe("buildSolidFill", () => {
    it("builds solid fill from hex color", () => {
      const fill = buildSolidFill("00FF00");
      expect(fill).toEqual({
        type: "solidFill",
        color: { spec: { type: "srgb", value: "00FF00" } },
      });
    });
  });

  describe("buildSolidFillFromSpec", () => {
    it("builds solid fill from hex string", () => {
      const fill = buildSolidFillFromSpec("0000FF");
      expect(fill.type).toBe("solidFill");
      expect(fill.color.spec).toEqual({ type: "srgb", value: "0000FF" });
    });

    it("builds solid fill from theme color", () => {
      const fill = buildSolidFillFromSpec({ theme: "accent2" });
      expect(fill.type).toBe("solidFill");
      expect(fill.color.spec).toEqual({ type: "scheme", value: "accent2" });
    });
  });

  describe("buildThemeFill", () => {
    it("builds theme fill with modifiers", () => {
      const fill = buildThemeFill({ theme: "accent3", lumMod: 75 });
      expect(fill.type).toBe("solidFill");
      expect(fill.color.spec).toEqual({ type: "scheme", value: "accent3" });
      expect(fill.color.transform?.lumMod).toBe(75000);
    });
  });
});
