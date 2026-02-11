/**
 * @file Japanese Text Rendering Test
 *
 * Tests Japanese text rendering with East Asian fonts.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.26 (rFonts)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/japanese", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("japanese"), import.meta.url);
  });

  it("renders Japanese text content", () => {
    expect(ctx.rendered.svg).toContain("Japanese text");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("japanese"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
