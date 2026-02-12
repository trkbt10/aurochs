/**
 * @file Table Row Can't Split Test
 *
 * Tests w:cantSplit (row cannot split across pages) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.6 (cantSplit)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/row-cant-split", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-row-cant-split"), import.meta.url);
  });

  it("renders table with cantSplit row", () => {
    expect(ctx.rendered.svg).toContain("This row cannot split");
  });

  it("keeps multi-line row together", () => {
    expect(ctx.rendered.svg).toContain("Line 2");
    expect(ctx.rendered.svg).toContain("Line 3");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-row-cant-split"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
