/**
 * @file Paragraph Bidi Rendering Test
 *
 * Tests w:bidi (bidirectional paragraph) rendering.
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

describe("paragraph/bidi", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("bidi"), import.meta.url);
  });

  it("renders bidirectional paragraph", () => {
    expect(ctx.rendered.svg).toContain("bidirectional paragraph");
  });

  it("renders mixed Arabic and English text in bidi paragraph", () => {
    expect(ctx.rendered.svg).toContain("mixed with English text");
  });

  it("renders non-bidi paragraph (default)", () => {
    expect(ctx.rendered.svg).toContain("default LTR");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("bidi"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
