/**
 * @file Paragraph Bidi Indent Rendering Test
 *
 * Tests w:ind@start and w:ind@end (bidi-aware indentation) rendering.
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

describe("paragraph/indent-bidi", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("indent-bidi"), import.meta.url);
  });

  it("renders paragraph with start indent", () => {
    expect(ctx.rendered.svg).toContain("start indent");
  });

  it("renders paragraph with end indent", () => {
    expect(ctx.rendered.svg).toContain("end indent");
  });

  it("renders paragraph with both start and end indent", () => {
    expect(ctx.rendered.svg).toContain("start=720 and end=360");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("indent-bidi"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
