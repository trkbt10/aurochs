/**
 * @file Table Shading Test
 *
 * Tests w:shd (table-level shading/background) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.59 (tblPr shd)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/shading", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-shading"), import.meta.url);
  });

  it("renders table with shading", () => {
    expect(ctx.rendered.svg).toContain("Cell A1");
  });

  it("applies background color to table", () => {
    // Check for shading color in SVG (DDEEFF = light blue)
    expect(ctx.rendered.svg).toMatch(/#DDEEFF|#ddeeff/i);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-shading"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
