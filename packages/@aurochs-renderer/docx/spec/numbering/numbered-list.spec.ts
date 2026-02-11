/**
 * @file Numbered List (Decimal) Rendering Test
 *
 * Tests w:numPr with decimal numbering format.
 *
 * @see ECMA-376-1:2016 Section 17.9 (Numbering)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("numbering/numbered-list", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("numbered-list"), import.meta.url);
  });

  it("renders numbered list items", () => {
    expect(ctx.rendered.svg).toContain("First item");
    expect(ctx.rendered.svg).toContain("Second item");
    expect(ctx.rendered.svg).toContain("Third item");
  });

  it("renders decimal numbers", () => {
    // Decimal numbers 1., 2., 3. should appear
    expect(ctx.rendered.svg).toContain("1.");
    expect(ctx.rendered.svg).toContain("2.");
    expect(ctx.rendered.svg).toContain("3.");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("numbered-list"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
