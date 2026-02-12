/**
 * @file Table Cell No Wrap Test
 *
 * Tests w:noWrap (cell no text wrap) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.30 (noWrap)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/cell-no-wrap", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-cell-no-wrap"), import.meta.url);
  });

  it("renders normal wrapping cell", () => {
    expect(ctx.rendered.svg).toContain("Normal wrapping cell");
  });

  it("renders no-wrap cell", () => {
    expect(ctx.rendered.svg).toContain("No wrap cell");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-cell-no-wrap"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
