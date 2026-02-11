/**
 * @file Line Spacing Rendering Test
 *
 * Tests w:spacing/@line rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.33 (spacing)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/line-spacing", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("line-spacing"), import.meta.url);
  });

  it("renders paragraph with line spacing", () => {
    expect(ctx.rendered.svg).toContain("Double spaced");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("line-spacing"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
