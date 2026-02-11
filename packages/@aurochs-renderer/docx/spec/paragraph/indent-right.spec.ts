/**
 * @file Right Indent Rendering Test
 *
 * Tests w:ind/@right (right indentation) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.12 (ind)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/indent-right", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("indent-right"), import.meta.url);
  });

  it("renders paragraph with right indent", () => {
    expect(ctx.rendered.svg).toContain("right indent");
  });

  it("text wraps before the right margin", () => {
    // With 1 inch right indent, text should wrap earlier than default
    const para = ctx.rendered.pages[0].paragraphs[0];
    expect(para.lines.length).toBeGreaterThan(1);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("indent-right"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
