/**
 * @file First Page Header Test
 *
 * Tests w:headerReference/@type=first (first page header) rendering.
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

describe("section/header-first", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("header-first"), import.meta.url);
  });

  it("renders document body content", () => {
    expect(ctx.rendered.svg).toContain("different first page header");
  });

  it("renders first page header", () => {
    // First page should have special header
    expect(ctx.rendered.svg).toContain("FIRST PAGE HEADER");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("header-first"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
