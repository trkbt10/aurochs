/**
 * @file Odd/Even Header Test
 *
 * Tests w:headerReference/@type=even (even page header) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.10.5 (headerReference)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/header-even", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("header-even"), import.meta.url);
  });

  it("renders document body content", () => {
    expect(ctx.rendered.svg).toContain("odd/even headers");
  });

  it("renders odd page header on first page", () => {
    // First page (odd) should show odd header
    expect(ctx.rendered.svg).toContain("ODD PAGE HEADER");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("header-even"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
