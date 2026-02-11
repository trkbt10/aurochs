/**
 * @file Hebrew Text Rendering Test
 *
 * Tests Hebrew RTL text rendering with Complex Script properties.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.30 (rtl)
 * @see ECMA-376-1:2016 Section 17.3.2.18 (iCs)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/hebrew", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("hebrew"), import.meta.url);
  });

  it("renders Hebrew text content", () => {
    expect(ctx.rendered.svg).toContain("Hebrew:");
    expect(ctx.rendered.svg).toContain("text sample");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("hebrew"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
