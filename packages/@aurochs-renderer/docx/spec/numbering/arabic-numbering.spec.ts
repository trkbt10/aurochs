/**
 * @file Arabic Numbering Rendering Test
 *
 * Tests w:numPr with Arabic (RTL) numbering format.
 *
 * @see ECMA-376-1:2016 Section 17.9 (Numbering)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("numbering/arabic-numbering", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("arabic-numbering"), import.meta.url);
  });

  it("renders Arabic list items", () => {
    expect(ctx.rendered.svg).toContain("العنصر الأول");
    expect(ctx.rendered.svg).toContain("العنصر الثاني");
    expect(ctx.rendered.svg).toContain("العنصر الثالث");
  });

  it("renders Arabic list header", () => {
    expect(ctx.rendered.svg).toContain("قائمة عربية");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("arabic-numbering"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
