/**
 * @file Font Size Rendering Test
 *
 * Tests w:sz (font size) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.38 (sz)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/font-size", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("font-size"), import.meta.url);
  });

  it("renders text with different font sizes", () => {
    expect(ctx.rendered.svg).toContain("Small");
    expect(ctx.rendered.svg).toContain("Medium");
    expect(ctx.rendered.svg).toContain("Large");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("font-size"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
