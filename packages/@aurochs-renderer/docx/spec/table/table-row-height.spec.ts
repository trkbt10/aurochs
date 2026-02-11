/**
 * @file Table Row Height Rendering Test
 *
 * Tests row height property (w:trHeight).
 *
 * @see ECMA-376-1:2016 Section 17.4.81 (trHeight)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-row-height", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-row-height"), import.meta.url);
  });

  it("renders row content", () => {
    expect(ctx.rendered.svg).toContain("exact 720 twips");
    expect(ctx.rendered.svg).toContain("atLeast 1440 twips");
  });

  it("has table with row heights", () => {
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
    const table = ctx.rendered.tables[0];
    expect(table).toBeDefined();
    expect(table!.rows.length).toBe(2);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-row-height"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
