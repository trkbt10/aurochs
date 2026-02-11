/**
 * @file Paragraph Borders Rendering Test
 *
 * Tests w:pBdr (paragraph borders) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.24 (pBdr)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/borders", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("borders"), import.meta.url);
  });

  it("renders paragraph with top border", () => {
    expect(ctx.rendered.svg).toContain("top border");
  });

  it("renders paragraph with bottom border", () => {
    expect(ctx.rendered.svg).toContain("bottom border");
  });

  it("renders paragraph with left border", () => {
    expect(ctx.rendered.svg).toContain("left border");
  });

  it("renders paragraph with right border", () => {
    expect(ctx.rendered.svg).toContain("right border");
  });

  it("renders paragraph with all four borders (box)", () => {
    expect(ctx.rendered.svg).toContain("all four borders");
  });

  it("renders paragraph with between border", () => {
    expect(ctx.rendered.svg).toContain("between border");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("borders"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
