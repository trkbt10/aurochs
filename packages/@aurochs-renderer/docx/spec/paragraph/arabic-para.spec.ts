/**
 * @file Arabic Paragraph Rendering Test
 *
 * Tests Arabic text paragraph rendering with RTL direction.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.6 (bidi)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/arabic", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("arabic-para"), import.meta.url);
  });

  it("renders Arabic paragraph", () => {
    // Check for Arabic text characters
    expect(ctx.rendered.svg).toMatch(/[\u0600-\u06FF]/);
  });

  it("renders mixed Arabic and English paragraph", () => {
    expect(ctx.rendered.svg).toContain("English text");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("arabic-para"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
