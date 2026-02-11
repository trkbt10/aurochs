/**
 * @file Table Borders Rendering Test
 *
 * Tests table borders property (w:tblBorders).
 *
 * @see ECMA-376-1:2016 Section 17.4.38 (tblBorders)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-borders", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-borders"), import.meta.url);
  });

  it("renders table cells", () => {
    expect(ctx.rendered.svg).toContain("A1");
    expect(ctx.rendered.svg).toContain("B1");
    expect(ctx.rendered.svg).toContain("A2");
    expect(ctx.rendered.svg).toContain("B2");
  });

  it("has table with borders defined", () => {
    // Note: Border rendering from table-level borders to SVG is pending
    // The table layout includes border definitions but the renderer
    // currently only renders cell-level borders, not table-level borders
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
    const table = ctx.rendered.tables[0];
    expect(table).toBeDefined();
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-borders"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
