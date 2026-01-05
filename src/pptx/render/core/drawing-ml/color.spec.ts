/**
 * @file Tests for color resolution transforms
 */

import type { Color } from "../../../domain/color";
import { pct } from "../../../domain/types";
import { resolveColor } from "./color";

describe("resolveColor", () => {
  it("applies blueMod transform (ECMA-376 Section 20.1.2.3.5)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "3366FF" },
      transform: { blueMod: pct(50) },
    };

    expect(resolveColor(color)).toBe("336680");
  });

  it("applies blueOff transform (ECMA-376 Section 20.1.2.3.6)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "336633" },
      transform: { blueOff: pct(20) },
    };

    expect(resolveColor(color)).toBe("336666");
  });

  it("applies gamma transform (ECMA-376 Section 20.1.2.3.8)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "808080" },
      transform: { gamma: true },
    };

    expect(resolveColor(color)).toBe("BCBCBC");
  });

  it("applies invGamma transform (ECMA-376 Section 20.1.2.3.18)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "BCBCBC" },
      transform: { invGamma: true },
    };

    expect(resolveColor(color)).toBe("808080");
  });

  it("applies green transform (ECMA-376 Section 20.1.2.3.10)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "336633" },
      transform: { green: pct(100) },
    };

    expect(resolveColor(color)).toBe("33FF33");
  });

  it("applies greenMod transform (ECMA-376 Section 20.1.2.3.11)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "336633" },
      transform: { greenMod: pct(50) },
    };

    expect(resolveColor(color)).toBe("333333");
  });

  it("applies greenOff transform (ECMA-376 Section 20.1.2.3.12)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "336633" },
      transform: { greenOff: pct(20) },
    };

    expect(resolveColor(color)).toBe("339933");
  });

  it("applies redMod transform (ECMA-376 Section 20.1.2.3.24)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "663333" },
      transform: { redMod: pct(50) },
    };

    expect(resolveColor(color)).toBe("333333");
  });

  it("applies redOff transform (ECMA-376 Section 20.1.2.3.25)", () => {
    const color: Color = {
      spec: { type: "srgb", value: "663333" },
      transform: { redOff: pct(20) },
    };

    expect(resolveColor(color)).toBe("993333");
  });
});
