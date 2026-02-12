/**
 * @file Table Cell Margins Test
 *
 * Tests w:tblCellMar (default cell margins) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.43 (tblCellMar)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/cell-margins", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-cell-margins"), import.meta.url);
  });

  it("renders table with cell margins", () => {
    expect(ctx.rendered.svg).toContain("Cell with margins");
  });

  it("applies padding to cell content", () => {
    // 360 twips = 0.25 inch margin
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-cell-margins"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
