/**
 * @file Hebrew Paragraph Rendering Test
 *
 * Tests Hebrew text paragraph rendering with RTL direction.
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

describe("paragraph/hebrew", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("hebrew-para"), import.meta.url);
  });

  it("renders Hebrew paragraph", () => {
    // Check for Hebrew text characters
    expect(ctx.rendered.svg).toMatch(/[\u0590-\u05FF]/);
  });

  it("renders mixed Hebrew and English paragraph", () => {
    expect(ctx.rendered.svg).toContain("English text");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("hebrew-para"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
