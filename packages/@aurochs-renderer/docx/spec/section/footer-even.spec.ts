/**
 * @file Odd/Even Footer Test
 *
 * Tests w:footerReference/@type=even (even page footer) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.10.4 (footerReference)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/footer-even", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("footer-even"), import.meta.url);
  });

  it("renders document body content", () => {
    expect(ctx.rendered.svg).toContain("odd/even footers");
  });

  it("renders odd page footer on first page", () => {
    // First page (odd) should show odd footer
    expect(ctx.rendered.svg).toContain("ODD PAGE FOOTER");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("footer-even"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
