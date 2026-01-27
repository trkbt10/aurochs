import { describe, expect, it } from "vitest";
import type { BlipFill } from "./types";
import { formatRgba, resolveBlipFill, resolveFill } from "./fill";

describe("pptx/domain/color/fill", () => {
  describe("formatRgba", () => {
    it("returns hex when alpha is 1", () => {
      expect(formatRgba("FF0000", 1)).toBe("#FF0000");
    });

    it("returns rgba() when alpha is less than 1", () => {
      expect(formatRgba("FF0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    });
  });

  describe("resolveBlipFill", () => {
    it("uses data URL directly and defaults to stretch", () => {
      const fill: BlipFill = {
        type: "blipFill",
        resourceId: "data:image/png;base64,AAA",
        relationshipType: "embed",
        rotWithShape: false,
      };
      expect(resolveBlipFill(fill)).toEqual({
        type: "image",
        src: "data:image/png;base64,AAA",
        mode: "stretch",
      });
    });

    it("uses resolver for relationship IDs", () => {
      const fill: BlipFill = {
        type: "blipFill",
        resourceId: "rId2",
        relationshipType: "embed",
        rotWithShape: false,
      };
      expect(resolveBlipFill(fill, (rid) => (rid === "rId2" ? "data:image/png;base64,BBB" : undefined))).toEqual({
        type: "image",
        src: "data:image/png;base64,BBB",
        mode: "stretch",
      });
    });
  });

  describe("resolveFill", () => {
    it("resolves blipFill to image fill", () => {
      const fill: BlipFill = {
        type: "blipFill",
        resourceId: "data:image/png;base64,CCC",
        relationshipType: "embed",
        rotWithShape: false,
      };
      expect(resolveFill(fill)).toEqual({
        type: "image",
        src: "data:image/png;base64,CCC",
        mode: "stretch",
      });
    });
  });
});

