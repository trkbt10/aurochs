/**
 * @file Table Cell Text Direction Test
 *
 * Tests w:textDirection (cell text direction) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.4.71 (textDirection)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/cell-text-direction", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-cell-text-direction"), import.meta.url);
  });

  it("renders cell with normal text direction", () => {
    expect(ctx.rendered.svg).toContain("Normal LR-TB");
  });

  it("renders cell with vertical text direction", () => {
    expect(ctx.rendered.svg).toContain("Top-Bottom RL");
    expect(ctx.rendered.svg).toContain("Bottom-Top LR");
  });

  it("applies text rotation for vertical directions", () => {
    // tbRl and btLr should have rotation transforms
    expect(ctx.rendered.svg).toMatch(/transform|rotate/);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-cell-text-direction"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
