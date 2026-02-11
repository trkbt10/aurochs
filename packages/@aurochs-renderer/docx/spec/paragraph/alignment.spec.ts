/**
 * @file Paragraph Alignment Rendering Test
 *
 * Tests w:jc (justification) rendering.
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

describe("paragraph/alignment", () => {
  describe("center", () => {
    const ctx: Context = {} as Context;

    beforeAll(async () => {
      ctx.rendered = await loadAndRender(fixture("alignment-center"), import.meta.url);
    });

    it("renders centered text", () => {
      expect(ctx.rendered.svg).toContain("Centered text");
    });

    it("applies center alignment to paragraph", () => {
      expect(ctx.rendered.pages[0].paragraphs[0].alignment).toBe("center");
    });

    it("renders page correctly", () => {
      const baseline = baselinePath(fixture("alignment-center"), import.meta.url);
      const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });
});
