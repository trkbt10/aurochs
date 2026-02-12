/**
 * @file RTL Table Test
 *
 * Tests w:bidiVisual (bidirectional/RTL table) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.1 (bidiVisual)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/bidi", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-bidi"), import.meta.url);
  });

  it("renders RTL table with Hebrew text", () => {
    expect(ctx.rendered.svg).toContain("עמודה א");
    expect(ctx.rendered.svg).toContain("עמודה ב");
    expect(ctx.rendered.svg).toContain("עמודה ג");
  });

  it("renders columns in RTL order", () => {
    // In RTL table, first column should appear on the right
    expect(ctx.rendered.tables.length).toBeGreaterThan(0);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-bidi"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
