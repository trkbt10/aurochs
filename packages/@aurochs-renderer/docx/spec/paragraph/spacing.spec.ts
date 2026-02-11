/**
 * @file Paragraph Spacing Rendering Test
 *
 * Tests w:spacing (before/after) rendering.
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

describe("paragraph/spacing", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("spacing-before-after"), import.meta.url);
  });

  it("renders paragraphs with spacing", () => {
    expect(ctx.rendered.svg).toContain("First paragraph");
    expect(ctx.rendered.svg).toContain("Paragraph with spacing");
    expect(ctx.rendered.svg).toContain("Third paragraph");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("spacing-before-after"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
