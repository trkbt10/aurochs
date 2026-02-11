/**
 * @file RTL Alignment Rendering Test
 *
 * Tests RTL paragraph with left and right alignment.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.6 (bidi)
 * @see ECMA-376-1:2016 Section 17.3.1.13 (jc)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { renderedLeft: RenderedFixture; renderedRight: RenderedFixture };

describe("paragraph/rtl-alignment", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.renderedLeft = await loadAndRender(fixture("rtl-left-align"), import.meta.url);
    ctx.renderedRight = await loadAndRender(fixture("rtl-right-align"), import.meta.url);
  });

  describe("RTL + left align", () => {
    it("renders RTL paragraph with left alignment", () => {
      expect(ctx.renderedLeft.svg).toContain("left alignment");
    });

    it("applies left alignment to RTL paragraph", () => {
      expect(ctx.renderedLeft.pages[0].paragraphs[0].alignment).toBe("left");
    });

    it("renders page correctly", () => {
      const baseline = baselinePath(fixture("rtl-left-align"), import.meta.url);
      const result = compareToBaseline(ctx.renderedLeft.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });

  describe("RTL + right align", () => {
    it("renders RTL paragraph with right alignment", () => {
      expect(ctx.renderedRight.svg).toContain("right alignment");
    });

    it("applies right alignment to RTL paragraph", () => {
      expect(ctx.renderedRight.pages[0].paragraphs[0].alignment).toBe("right");
    });

    it("renders page correctly", () => {
      const baseline = baselinePath(fixture("rtl-right-align"), import.meta.url);
      const result = compareToBaseline(ctx.renderedRight.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });
});
