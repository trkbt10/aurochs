/**
 * @file Justify Alignment Rendering Test
 *
 * Tests w:jc both (justify) alignment.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.13 (jc)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/alignment-justify", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("alignment-justify"), import.meta.url);
  });

  it("renders justified text", () => {
    expect(ctx.rendered.svg).toContain("justified");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("alignment-justify"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
