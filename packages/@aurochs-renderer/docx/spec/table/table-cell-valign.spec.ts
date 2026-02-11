/**
 * @file Table Cell Vertical Alignment Rendering Test
 *
 * Tests cell vertical alignment property (w:vAlign).
 *
 * @see ECMA-376-1:2016 Section 17.4.84 (vAlign)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-cell-valign", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-cell-valign"), import.meta.url);
  });

  it("renders cell content", () => {
    expect(ctx.rendered.svg).toContain("Top");
    expect(ctx.rendered.svg).toContain("Center");
    expect(ctx.rendered.svg).toContain("Bottom");
  });

  it("has table with cells", () => {
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
    const table = ctx.rendered.tables[0];
    expect(table).toBeDefined();
    expect(table!.rows[0]?.cells.length).toBe(3);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-cell-valign"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
