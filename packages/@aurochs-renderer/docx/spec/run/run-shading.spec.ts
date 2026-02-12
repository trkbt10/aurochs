/**
 * @file Run Shading Test
 *
 * Tests w:shd (run shading/background) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.32 (shd)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/shading", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("run-shading"), import.meta.url);
  });

  it("renders text with shading", () => {
    expect(ctx.rendered.svg).toContain("yellow background");
    expect(ctx.rendered.svg).toContain("cyan background");
  });

  it("applies background color to shaded text", () => {
    // Check for fill color in the SVG (yellow = FFFF00, cyan = 00FFFF)
    expect(ctx.rendered.svg).toMatch(/#FFFF00|#ffff00/i);
    expect(ctx.rendered.svg).toMatch(/#00FFFF|#00ffff/i);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("run-shading"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
