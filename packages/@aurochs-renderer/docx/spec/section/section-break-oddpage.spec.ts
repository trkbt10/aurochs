/**
 * @file Odd Page Section Break Test
 *
 * Tests w:type val="oddPage" (odd page section break) rendering.
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

describe("section/section-break-oddpage", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("section-break-oddpage"), import.meta.url);
  });

  it("renders section 1 content", () => {
    expect(ctx.rendered.svg).toContain("Section 1 content");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("section-break-oddpage"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
