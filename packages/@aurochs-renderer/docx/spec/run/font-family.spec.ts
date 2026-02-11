/**
 * @file Font Family Rendering Test
 *
 * Tests w:rFonts (run fonts) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.26 (rFonts)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/font-family", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("font-family"), import.meta.url);
  });

  it("renders default font as sans-serif", () => {
    expect(ctx.rendered.svg).toContain('font-family="sans-serif"');
  });

  it("renders Times New Roman font", () => {
    expect(ctx.rendered.svg).toContain('font-family="Times New Roman"');
  });

  it("renders Courier New font", () => {
    expect(ctx.rendered.svg).toContain('font-family="Courier New"');
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("font-family"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
