/**
 * @file Mixed Bidirectional Paragraph Rendering Test
 *
 * Tests mixed bidirectional text paragraph rendering.
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

describe("paragraph/mixed-bidi", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("mixed-bidi-para"), import.meta.url);
  });

  it("renders LTR text with embedded RTL", () => {
    expect(ctx.rendered.svg).toContain("LTR text");
  });

  it("renders Arabic text", () => {
    // Check for Arabic text characters
    expect(ctx.rendered.svg).toMatch(/[\u0600-\u06FF]/);
  });

  it("renders Hebrew text", () => {
    // Check for Hebrew text characters
    expect(ctx.rendered.svg).toMatch(/[\u0590-\u05FF]/);
  });

  it("renders mixed bidirectional text", () => {
    expect(ctx.rendered.svg).toContain("mixed bidirectional");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("mixed-bidi-para"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
