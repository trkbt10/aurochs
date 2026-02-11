/**
 * @file Italic Text Rendering Test
 *
 * Tests w:i (italic) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.16 (i)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/italic", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("italic"), import.meta.url);
  });

  it("renders italic text with font-style italic", () => {
    expect(ctx.rendered.svg).toContain("italic");
    expect(ctx.rendered.svg).toMatch(/font-style[=:]["']?italic/);
  });

  it("renders non-italic text", () => {
    expect(ctx.rendered.svg).toContain("This is");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("italic"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
