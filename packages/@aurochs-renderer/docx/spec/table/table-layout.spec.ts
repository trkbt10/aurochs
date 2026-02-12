/**
 * @file Table Layout Test
 *
 * Tests w:tblLayout (table layout algorithm) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.53 (tblLayout)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/layout", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-layout"), import.meta.url);
  });

  it("renders fixed layout table", () => {
    expect(ctx.rendered.svg).toContain("Fixed layout");
  });

  it("renders autofit layout table", () => {
    expect(ctx.rendered.svg).toContain("Autofit layout");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-layout"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
