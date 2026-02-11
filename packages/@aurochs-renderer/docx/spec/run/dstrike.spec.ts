/**
 * @file Double Strikethrough Text Rendering Test
 *
 * Tests w:dstrike (double strikethrough) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.9 (dstrike)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/dstrike", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("dstrike"), import.meta.url);
  });

  it("renders double strikethrough text", () => {
    expect(ctx.rendered.svg).toContain("double strikethrough");
  });

  it("renders with text-decoration line-through", () => {
    expect(ctx.rendered.svg).toContain('text-decoration="line-through"');
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("dstrike"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
