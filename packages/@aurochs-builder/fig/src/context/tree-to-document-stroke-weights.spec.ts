/**
 * @file extractIndividualStrokeWeights — Figma independent-border semantics
 *
 * Regression for Bento Passport (116:377) top accent and Spine/Line/Header
 * bottom rules. Figma stores these as `borderStrokeWeightsIndependent=true`
 * with only ONE per-side weight defined; other sides are intentionally
 * absent and must render as 0 (no border on that side).
 *
 * A prior iteration fell back to `strokeWeight` for missing sides,
 * turning single-side accents into full 4-sided borders.
 */

import { convertFigNode } from "./tree-to-document";
import type { FigNode } from "@aurochs/fig/types";

function makeFrameRaw(partial: Partial<FigNode>): FigNode {
  return {
    guid: { sessionID: 100, localID: 1 },
    type: { value: 0, name: "FRAME" },
    name: "test",
    ...partial,
  };
}

describe("extractIndividualStrokeWeights — Figma independent-border semantics", () => {
  it("undefined per-side weight is 0, not strokeWeight fallback", () => {
    // Passport FRAME shape: borderTopWeight=8, others undefined, strokeWeight=1.
    // Figma renders this as a top-only 8px accent, NOT 8px top + 1px on
    // other three sides.
    const raw = makeFrameRaw({
      borderStrokeWeightsIndependent: true,
      borderTopWeight: 8,
      strokeWeight: 1,
      strokeAlign: { value: 1, name: "INSIDE" },
    });
    const domain = convertFigNode(raw, new Map());
    expect(domain.individualStrokeWeights).toEqual({ top: 8, right: 0, bottom: 0, left: 0 });
  });

  it("bottom-only accent (Spine / Line / Header pattern)", () => {
    const raw = makeFrameRaw({
      borderStrokeWeightsIndependent: true,
      borderBottomWeight: 2,
      strokeWeight: 1,
    });
    const domain = convertFigNode(raw, new Map());
    expect(domain.individualStrokeWeights).toEqual({ top: 0, right: 0, bottom: 2, left: 0 });
  });

  it("all four sides explicitly equal → collapse to uniform (undefined)", () => {
    const raw = makeFrameRaw({
      borderStrokeWeightsIndependent: true,
      borderTopWeight: 2,
      borderRightWeight: 2,
      borderBottomWeight: 2,
      borderLeftWeight: 2,
    });
    const domain = convertFigNode(raw, new Map());
    // All equal → renderer uses uniform stroke path instead of 4 lines.
    expect(domain.individualStrokeWeights).toBeUndefined();
  });

  it("mixed asymmetric weights are preserved", () => {
    const raw = makeFrameRaw({
      borderStrokeWeightsIndependent: true,
      borderTopWeight: 1,
      borderRightWeight: 2,
      borderBottomWeight: 3,
      borderLeftWeight: 4,
    });
    const domain = convertFigNode(raw, new Map());
    expect(domain.individualStrokeWeights).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  it("non-independent flag + no per-side weights → undefined", () => {
    const raw = makeFrameRaw({ strokeWeight: 1 });
    const domain = convertFigNode(raw, new Map());
    expect(domain.individualStrokeWeights).toBeUndefined();
  });
});
