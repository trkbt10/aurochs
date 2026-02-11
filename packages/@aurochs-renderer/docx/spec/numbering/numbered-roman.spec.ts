/**
 * @file Numbered List (Roman Numerals) Rendering Test
 *
 * Tests w:numPr with upperRoman numbering format.
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

describe("numbering/numbered-roman", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("numbered-roman"), import.meta.url);
  });

  it("renders roman numeral list items", () => {
    expect(ctx.rendered.svg).toContain("First item");
    expect(ctx.rendered.svg).toContain("Second item");
    expect(ctx.rendered.svg).toContain("Third item");
  });

  it("renders roman numerals", () => {
    // Roman numerals I., II., III. should appear
    expect(ctx.rendered.svg).toContain("I.");
    expect(ctx.rendered.svg).toContain("II.");
    expect(ctx.rendered.svg).toContain("III.");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("numbered-roman"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
