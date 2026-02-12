/**
 * @file First Page Footer Test
 *
 * Tests w:footerReference/@type=first (first page footer) rendering.
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

describe("section/footer-first", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("footer-first"), import.meta.url);
  });

  it("renders document body content", () => {
    expect(ctx.rendered.svg).toContain("different first page footer");
  });

  it("renders first page footer", () => {
    // First page should have special footer
    expect(ctx.rendered.svg).toContain("FIRST PAGE FOOTER");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("footer-first"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
