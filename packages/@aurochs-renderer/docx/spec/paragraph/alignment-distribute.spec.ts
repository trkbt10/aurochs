/**
 * @file Paragraph Alignment Distribute Rendering Test
 *
 * Tests w:jc="distribute" (East Asian text distribution) rendering.
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

describe("paragraph/alignment-distribute", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("alignment-distribute"), import.meta.url);
  });

  it("renders text with distribute alignment", () => {
    expect(ctx.rendered.svg).toContain("distribute alignment");
  });

  it("applies distribute alignment to paragraph", () => {
    // Internal representation uses "distributed"
    expect(ctx.rendered.pages[0].paragraphs[0].alignment).toBe("distributed");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("alignment-distribute"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
