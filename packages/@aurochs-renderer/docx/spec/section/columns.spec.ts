/**
 * @file Columns Rendering Test
 *
 * Tests w:cols column properties (num, equalWidth, space).
 *
 * @see ECMA-376-1:2016 Section 17.6.4 (cols)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/columns", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("columns"), import.meta.url);
  });

  it("renders columns content", () => {
    expect(ctx.rendered.svg).toContain("two-column");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("columns"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
