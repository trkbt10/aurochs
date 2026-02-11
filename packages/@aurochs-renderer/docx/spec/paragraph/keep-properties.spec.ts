/**
 * @file Keep Properties Rendering Test
 *
 * Tests w:keepNext, w:keepLines, w:pageBreakBefore rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.14 (keepNext)
 * @see ECMA-376-1:2016 Section 17.3.1.15 (keepLines)
 * @see ECMA-376-1:2016 Section 17.3.1.23 (pageBreakBefore)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/keep-properties", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("keep-properties"), import.meta.url);
  });

  it("renders paragraph with keepNext", () => {
    expect(ctx.rendered.svg).toContain("keepNext=true");
  });

  it("renders paragraph with keepLines", () => {
    expect(ctx.rendered.svg).toContain("keepLines=true");
  });

  it("renders paragraph with pageBreakBefore", () => {
    expect(ctx.rendered.svg).toContain("pageBreakBefore=true");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("keep-properties"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
