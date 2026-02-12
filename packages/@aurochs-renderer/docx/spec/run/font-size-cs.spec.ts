/**
 * @file Complex Script Font Size Test
 *
 * Tests w:szCs (complex script font size) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.39 (szCs)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/font-size-cs", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("font-size-cs"), import.meta.url);
  });

  it("renders Arabic text with complex script size", () => {
    expect(ctx.rendered.svg).toContain("مرحبا");
  });

  it("renders Hebrew text with complex script size", () => {
    expect(ctx.rendered.svg).toContain("שלום");
  });

  it("applies different font sizes to complex script text", () => {
    // szCs=36 should result in 18pt (18 * 1.333 ≈ 24px), szCs=28 should result in 14pt (14 * 1.333 ≈ 18.67px)
    expect(ctx.rendered.svg).toMatch(/font-size[=:]["']?24/);
    expect(ctx.rendered.svg).toMatch(/font-size[=:]["']?(18\.6|19)/);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("font-size-cs"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
