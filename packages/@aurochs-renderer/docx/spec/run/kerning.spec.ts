/**
 * @file Kerning Rendering Test
 *
 * Tests w:kern (kerning threshold) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.19 (kern)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/kerning", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("kerning"), import.meta.url);
  });

  it("renders kerned text content", () => {
    expect(ctx.rendered.svg).toContain("AVATAR");
    expect(ctx.rendered.svg).toContain("No kerning");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("kerning"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
