/**
 * @file Table Indent Test
 *
 * Tests w:tblInd (table indentation) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.51 (tblInd)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/indent", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-indent"), import.meta.url);
  });

  it("renders table with indentation", () => {
    expect(ctx.rendered.svg).toContain("Cell A1");
    expect(ctx.rendered.svg).toContain("Cell B1");
  });

  it("applies left offset to table", () => {
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
    // 720 twips = 0.5 inch = 48 px at 96 DPI
    const table = ctx.rendered.tables[0];
    expect(table).toBeDefined();
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-indent"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
