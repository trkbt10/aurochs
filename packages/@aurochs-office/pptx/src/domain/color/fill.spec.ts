/** @file Unit tests for fill resolution functions */
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
    it("returns undefined without resolver", () => {
      const fill: BlipFill = {
        type: "blipFill",
        resourceId: "rId1",
        relationshipType: "embed",
        rotWithShape: false,
      };
      expect(resolveBlipFill(fill)).toBeUndefined();
    });

    it("uses resolver for resource IDs and defaults to stretch", () => {
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
    it("resolves blipFill to image fill via resolver", () => {
      const fill: BlipFill = {
        type: "blipFill",
        resourceId: "rId3",
        relationshipType: "embed",
        rotWithShape: false,
      };
      const resolver = (rid: string) => (rid === "rId3" ? "data:image/png;base64,CCC" : undefined);
      expect(resolveFill(fill, undefined, resolver)).toEqual({
        type: "image",
        src: "data:image/png;base64,CCC",
        mode: "stretch",
      });
    });
  });
});
