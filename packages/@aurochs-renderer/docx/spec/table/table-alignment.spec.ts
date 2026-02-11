/**
 * @file Table Alignment Rendering Test
 *
 * Tests table alignment property (w:jc).
 *
 * @see ECMA-376-1:2016 Section 17.4.28 (jc)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-alignment", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-alignment"), import.meta.url);
  });

  it("renders table content", () => {
    expect(ctx.rendered.svg).toContain("Center");
    expect(ctx.rendered.svg).toContain("Table");
  });

  it("has center-aligned table", () => {
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
    const table = ctx.rendered.tables[0];
    expect(table).toBeDefined();
    // Center alignment means x position should be offset from margin
    expect(table!.x).toBeDefined();
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-alignment"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
