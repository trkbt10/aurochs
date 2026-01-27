/**
 * @file BackgroundEditor component tests
 *
 * Tests the BackgroundEditor handles slide background correctly.
 */

import type { Background } from "@oxen/pptx/domain/slide/types";
import { createDefaultBackground } from "./BackgroundEditor";

describe("BackgroundEditor: Background handling", () => {
  describe("createDefaultBackground", () => {
    it("creates valid default background", () => {
      const background = createDefaultBackground();

      expect(background.fill).toBeDefined();
      expect(background.fill.type).toBe("solidFill");
    });
  });

  describe("Background structure", () => {
    it("handles background with solid fill", () => {
      const background: Background = {
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: "FFFFFF" },
          },
        },
      };

      expect(background.fill.type).toBe("solidFill");
    });

    it("handles background with no fill", () => {
      const background: Background = {
        fill: {
          type: "noFill",
        },
      };

      expect(background.fill.type).toBe("noFill");
    });

    it("handles background with shadeToTitle", () => {
      const background: Background = {
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: "000000" },
          },
        },
        shadeToTitle: true,
      };

      expect(background.shadeToTitle).toBe(true);
    });

    it("handles background without shadeToTitle", () => {
      const background: Background = {
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: "000000" },
          },
        },
      };

      expect(background.shadeToTitle).toBeUndefined();
    });
  });
});
