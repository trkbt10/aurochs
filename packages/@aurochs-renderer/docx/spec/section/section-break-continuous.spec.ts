/**
 * @file Continuous Section Break Test
 *
 * Tests w:type val="continuous" (continuous section break) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.6.22 (type)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/section-break-continuous", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("section-break-continuous"), import.meta.url);
  });

  it("renders section 1 content", () => {
    expect(ctx.rendered.svg).toContain("Section 1 content");
  });

  it("renders section 2 content on same page", () => {
    // Continuous break should keep content on same page
    expect(ctx.rendered.svg).toContain("Section 2 continues");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("section-break-continuous"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
