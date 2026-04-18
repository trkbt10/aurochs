/**
 * @file Derived-path glyph transform tests
 *
 * Pins the alignment-offset behaviour of transformGlyphCommands. Figma's
 * derivedTextData stores glyph positions in a layout-relative coordinate
 * space and leaves the node-level text alignment (CENTER / RIGHT / BOTTOM)
 * for the renderer to apply when the resolved `layoutSize` is smaller than
 * the TEXT node's own box.
 *
 * Regression guard for: Action 3 reading-glasses SF Symbol. Before the
 * alignmentOffset parameter existed, single-glyph icon texts (70×70 box,
 * 44×44 layout) rendered 13 px left of their correct centered position.
 */

import { describe, it, expect } from "vitest";
import { transformGlyphCommands } from "./derived-paths";
import type { PathCommand } from "../../font/types";

describe("transformGlyphCommands", () => {
  const commands: PathCommand[] = [
    { type: "M", x: 0, y: 0 },
    { type: "L", x: 1, y: 0 },
  ];

  it("applies position + fontSize with zero alignment offset by default", () => {
    const out = transformGlyphCommands(commands, { x: 10, y: 20 }, 17);
    expect(out[0]).toEqual({ type: "M", x: 10, y: 20 });
    expect(out[1]).toEqual({ type: "L", x: 10 + 17, y: 20 });
  });

  it("translates glyphs horizontally by alignmentOffset.x", () => {
    const out = transformGlyphCommands(
      commands,
      { x: 3.29, y: 28.04 },
      17,
      { x: 13, y: 0 },
    );
    // X of M = position.x + alignmentOffset.x + 0 * fontSize
    expect(out[0]).toMatchObject({ type: "M", x: 3.29 + 13, y: 28 });
    // L x coordinate advances by fontSize in glyph-space, plus same offset.
    expect(out[1]).toMatchObject({ type: "L", x: 3.29 + 13 + 17, y: 28 });
  });

  it("rounds the baseline after applying alignmentOffset.y", () => {
    // position.y = 28.04, offset.y = 13 → baseline = round(41.04) = 41
    const out = transformGlyphCommands(
      [{ type: "M", x: 0, y: -0.03662 }],
      { x: 0, y: 28.04296875 },
      17,
      { x: 0, y: 13 },
    );
    // screen_y = baseline − normalized_y · fontSize
    // = 41 − (−0.03662) · 17 = 41 + 0.62254 ≈ 41.6226
    const m = out[0];
    if (m.type !== "M") throw new Error("expected M");
    expect(m.y).toBeCloseTo(41.6226, 3);
  });
});
