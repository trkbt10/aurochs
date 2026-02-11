/**
 * @file Text Color Rendering Test
 *
 * Tests w:color rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.6 (color)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/color", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("color"), import.meta.url);
  });

  it("renders colored text", () => {
    expect(ctx.rendered.svg).toContain("Red");
    expect(ctx.rendered.svg).toContain("Green");
    expect(ctx.rendered.svg).toContain("Blue");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("color"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
