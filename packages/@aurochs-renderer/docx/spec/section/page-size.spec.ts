/**
 * @file Page Size Rendering Test
 *
 * Tests w:pgSz page size properties (width, height, orientation).
 *
 * @see ECMA-376-1:2016 Section 17.6.13 (pgSz)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/page-size", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("page-size"), import.meta.url);
  });

  it("renders page size content", () => {
    expect(ctx.rendered.svg).toContain("landscape");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("page-size"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
