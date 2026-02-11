/**
 * @file Left Alignment Rendering Test
 *
 * Tests w:jc left alignment.
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

describe("paragraph/alignment-left", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("alignment-left"), import.meta.url);
  });

  it("renders left aligned text", () => {
    expect(ctx.rendered.svg).toContain("Left aligned");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("alignment-left"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
