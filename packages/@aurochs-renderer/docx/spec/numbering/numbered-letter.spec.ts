/**
 * @file Numbered List (Letter) Rendering Test
 *
 * Tests w:numPr with upperLetter numbering format.
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

describe("numbering/numbered-letter", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("numbered-letter"), import.meta.url);
  });

  it("renders letter list items", () => {
    expect(ctx.rendered.svg).toContain("First item");
    expect(ctx.rendered.svg).toContain("Second item");
    expect(ctx.rendered.svg).toContain("Third item");
  });

  it("renders letter markers", () => {
    // Letter markers A., B., C. should appear
    expect(ctx.rendered.svg).toContain("A.");
    expect(ctx.rendered.svg).toContain("B.");
    expect(ctx.rendered.svg).toContain("C.");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("numbered-letter"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
