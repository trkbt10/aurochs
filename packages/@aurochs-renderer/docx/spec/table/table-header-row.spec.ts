/**
 * @file Table Header Row Rendering Test
 *
 * Tests w:tblHeader row property.
 *
 * @see ECMA-376-1:2016 Section 17.4.50 (tblHeader)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-header-row", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-header-row"), import.meta.url);
  });

  it("renders header row content", () => {
    expect(ctx.rendered.svg).toContain("Name");
    expect(ctx.rendered.svg).toContain("Value");
    expect(ctx.rendered.svg).toContain("Status");
  });

  it("renders data rows", () => {
    expect(ctx.rendered.svg).toContain("Item 1");
    expect(ctx.rendered.svg).toContain("Item 2");
    expect(ctx.rendered.svg).toContain("Active");
    expect(ctx.rendered.svg).toContain("Pending");
  });

  it("has header row marked", () => {
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
    const table = ctx.rendered.tables[0];
    expect(table).toBeDefined();
    expect(table!.rows[0]?.isHeader).toBe(true);
    expect(table!.rows[1]?.isHeader).toBeFalsy();
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-header-row"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
