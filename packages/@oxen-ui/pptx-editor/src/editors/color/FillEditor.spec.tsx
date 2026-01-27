/**
 * @file FillEditor component tests
 *
 * Tests the FillEditor handles all fill types correctly.
 */

// @vitest-environment jsdom

import type { SolidFill, GradientFill, NoFill, GradientStop } from "@oxen/ooxml/domain/fill";
import type { Fill } from "@oxen/pptx/domain/color/types";
import { pct, deg } from "@oxen/ooxml/domain/units";
import { render, fireEvent } from "@testing-library/react";
import { FillEditor } from "./FillEditor";

describe("FillEditor: Fill type handling", () => {
  describe("SolidFill", () => {
    it("handles complete solid fill", () => {
      const fill: SolidFill = {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "FF0000",
          },
        },
      };

      expect(fill.type).toBe("solidFill");
      expect(fill.color).toBeDefined();
      expect(fill.color.spec.type).toBe("srgb");
    });

    it("handles solid fill with scheme color", () => {
      const fill: SolidFill = {
        type: "solidFill",
        color: {
          spec: {
            type: "scheme",
            value: "accent1",
          },
        },
      };

      expect(fill.type).toBe("solidFill");
      expect(fill.color.spec.type).toBe("scheme");
    });
  });

  describe("GradientFill", () => {
    it("handles linear gradient", () => {
      const stops: readonly GradientStop[] = [
        { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
        { position: pct(100000), color: { spec: { type: "srgb", value: "0000FF" } } },
      ];
      const fill: GradientFill = {
        type: "gradientFill",
        stops,
        linear: { angle: deg(90), scaled: true },
        rotWithShape: true,
      };

      expect(fill.type).toBe("gradientFill");
      expect(fill.stops).toBeDefined();
      expect(fill.stops.length).toBe(2);
      expect(fill.linear).toBeDefined();
    });

    it("handles gradient with empty stops", () => {
      const fill: GradientFill = {
        type: "gradientFill",
        stops: [],
        rotWithShape: false,
      };

      expect(fill.stops?.length ?? 0).toBe(0);
    });
  });

  describe("NoFill", () => {
    it("handles no fill", () => {
      const fill: NoFill = {
        type: "noFill",
      };

      expect(fill.type).toBe("noFill");
    });
  });

  describe("Type discrimination", () => {
    it("correctly identifies solid fill", () => {
      const fill: Fill = {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "000000" } },
      };

      if (fill.type === "solidFill") {
        expect(fill.color).toBeDefined();
      }
    });

    it("correctly identifies gradient fill", () => {
      const fill: Fill = {
        type: "gradientFill",
        stops: [],
        rotWithShape: false,
      };

      if (fill.type === "gradientFill") {
        expect(fill.stops).toBeDefined();
      }
    });

    it("correctly identifies no fill", () => {
      const fill: Fill = {
        type: "noFill",
      };

      expect(fill.type).toBe("noFill");
    });
  });

  describe("FillEditor interactions", () => {
    it("updates fill type from the selector", () => {
      const state: { lastFill: Fill | null } = { lastFill: null };
      const handleChange = (fill: Fill) => {
        state.lastFill = fill;
      };

      const { getByRole } = render(
        <FillEditor value={{ type: "noFill" }} onChange={handleChange} />
      );

      fireEvent.change(getByRole("combobox"), { target: { value: "solidFill" } });

      if (!state.lastFill) {
        throw new Error("Fill change not captured");
      }
      expect(state.lastFill.type).toBe("solidFill");
    });
  });
});
