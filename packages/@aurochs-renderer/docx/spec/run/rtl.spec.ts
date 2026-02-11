/**
 * @file RTL Text Rendering Test
 *
 * Tests w:rtl (right-to-left) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.30 (rtl)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/rtl", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("rtl"), import.meta.url);
  });

  it("renders RTL text content", () => {
    expect(ctx.rendered.svg).toContain("LTR text");
    expect(ctx.rendered.svg).toContain("RTL text");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("rtl"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
