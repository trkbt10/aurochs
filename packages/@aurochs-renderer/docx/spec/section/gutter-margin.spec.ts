/**
 * @file Gutter Margin Rendering Test
 *
 * Tests w:pgMar gutter attribute.
 *
 * @see ECMA-376-1:2016 Section 17.6.11 (pgMar)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/gutter-margin", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("gutter-margin"), import.meta.url);
  });

  it("renders content text", () => {
    expect(ctx.rendered.svg).toContain("0.5 inch gutter margin");
    expect(ctx.rendered.svg).toContain("extra space for binding");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("gutter-margin"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
