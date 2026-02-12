/**
 * @file Mixed LTR/RTL Table Cells Test
 *
 * Tests tables with mixed LTR and RTL cell content.
 *
 * @see ECMA-376-1:2016 Section 17.4 (Tables)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/mixed-bidi", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-mixed-bidi"), import.meta.url);
  });

  it("renders LTR cell content", () => {
    expect(ctx.rendered.svg).toContain("English LTR");
  });

  it("renders RTL Hebrew cell content", () => {
    expect(ctx.rendered.svg).toContain("עברית");
  });

  it("renders RTL Arabic cell content", () => {
    expect(ctx.rendered.svg).toContain("العربية");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-mixed-bidi"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
