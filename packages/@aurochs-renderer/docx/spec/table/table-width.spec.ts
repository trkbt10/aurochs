/**
 * @file Table Width Rendering Test
 *
 * Tests table width property (w:tblW).
 *
 * @see ECMA-376-1:2016 Section 17.4.64 (tblW)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-width", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-width"), import.meta.url);
  });

  it("renders table content", () => {
    expect(ctx.rendered.svg).toContain("Left");
    expect(ctx.rendered.svg).toContain("Right");
  });

  it("has table with specified width", () => {
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
    const table = ctx.rendered.tables[0];
    expect(table).toBeDefined();
    // Table should have a defined width
    expect(table!.width).toBeDefined();
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-width"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
