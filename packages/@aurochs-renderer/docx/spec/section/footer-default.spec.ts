/**
 * @file Default Footer Test
 *
 * Tests w:footerReference (default footer) rendering.
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

describe("section/footer-default", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("footer-default"), import.meta.url);
  });

  it("renders document body content", () => {
    expect(ctx.rendered.svg).toContain("Document with default footer");
  });

  it("renders footer content", () => {
    // Footer should contain confidential notice
    expect(ctx.rendered.svg).toContain("Confidential");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("footer-default"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
