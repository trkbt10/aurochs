/**
 * @file Tab Stops Rendering Test
 *
 * Tests w:tabs (tab stops) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.38 (tabs)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/tab-stops", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("tab-stops"), import.meta.url);
  });

  it("renders text with tabs", () => {
    expect(ctx.rendered.svg).toContain("Col1");
    expect(ctx.rendered.svg).toContain("Center");
    expect(ctx.rendered.svg).toContain("Right");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("tab-stops"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
