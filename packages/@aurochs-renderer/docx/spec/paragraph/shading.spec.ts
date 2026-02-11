/**
 * @file Paragraph Shading Rendering Test
 *
 * Tests w:shd (paragraph shading/background) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.32 (shd)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/shading", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("shading"), import.meta.url);
  });

  it("renders paragraph with yellow background", () => {
    expect(ctx.rendered.svg).toContain("yellow background");
  });

  it("renders paragraph with gray background", () => {
    expect(ctx.rendered.svg).toContain("light gray background");
  });

  it("renders paragraph without background", () => {
    expect(ctx.rendered.svg).toContain("no background");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("shading"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
