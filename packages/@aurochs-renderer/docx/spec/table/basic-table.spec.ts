/**
 * @file Basic Table Rendering Test
 *
 * Tests basic 2x2 table rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4 (Tables)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/basic-table", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("basic-table"), import.meta.url);
  });

  it("renders table cells", () => {
    expect(ctx.rendered.svg).toContain("Cell A1");
    expect(ctx.rendered.svg).toContain("Cell B1");
    expect(ctx.rendered.svg).toContain("Cell A2");
    expect(ctx.rendered.svg).toContain("Cell B2");
  });

  it("has table layout results", () => {
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("basic-table"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
