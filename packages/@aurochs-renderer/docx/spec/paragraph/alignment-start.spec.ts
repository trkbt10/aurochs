/**
 * @file Paragraph Alignment Start Rendering Test
 *
 * Tests w:jc="start" (bidi-aware start alignment) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.13 (jc)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/alignment-start", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("alignment-start"), import.meta.url);
  });

  it("renders text with start alignment", () => {
    expect(ctx.rendered.svg).toContain("start alignment");
  });

  it("applies start alignment to paragraph", () => {
    // Start alignment is converted to left in LTR context
    expect(ctx.rendered.pages[0].paragraphs[0].alignment).toBe("left");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("alignment-start"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
