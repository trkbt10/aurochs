/**
 * @file Page Numbering Test
 *
 * Tests w:pgNumType (page number format and start) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.6.12 (pgNumType)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/page-numbering", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("page-numbering"), import.meta.url);
  });

  it("renders document content", () => {
    expect(ctx.rendered.svg).toContain("Roman numeral");
  });

  it("documents page numbering configuration", () => {
    // Page numbering affects field codes, not directly visible in SVG
    expect(ctx.rendered.svg).toContain("upperRoman");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("page-numbering"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
