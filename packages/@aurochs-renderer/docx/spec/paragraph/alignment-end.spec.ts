/**
 * @file Paragraph Alignment End Rendering Test
 *
 * Tests w:jc="end" (bidi-aware end alignment) rendering.
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

describe("paragraph/alignment-end", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("alignment-end"), import.meta.url);
  });

  it("renders text with end alignment", () => {
    expect(ctx.rendered.svg).toContain("end alignment");
  });

  it("applies end alignment to paragraph", () => {
    // End alignment is converted to right in LTR context
    expect(ctx.rendered.pages[0].paragraphs[0].alignment).toBe("right");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("alignment-end"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
