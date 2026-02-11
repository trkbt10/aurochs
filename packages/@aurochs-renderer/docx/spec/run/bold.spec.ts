/**
 * @file Bold Text Rendering Test
 *
 * Tests w:b (bold) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.1 (b)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/bold", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("bold"), import.meta.url);
  });

  it("renders bold text with font-weight 700", () => {
    expect(ctx.rendered.svg).toContain("bold");
    expect(ctx.rendered.svg).toMatch(/font-weight[=:]["']?700/);
  });

  it("renders non-bold text without font-weight attribute", () => {
    expect(ctx.rendered.svg).toContain("This is");
    expect(ctx.rendered.svg).toMatch(/>This is <\/text>/);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("bold"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
