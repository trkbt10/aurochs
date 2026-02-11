/**
 * @file Complex Script Font Rendering Test
 *
 * Tests w:rFonts @cs attribute rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.26 (rFonts)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/font-complex-script", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("font-complex-script"), import.meta.url);
  });

  it("renders text content", () => {
    expect(ctx.rendered.svg).toContain("Default font");
    expect(ctx.rendered.svg).toContain("Arial CS");
    expect(ctx.rendered.svg).toContain("Times CS");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("font-complex-script"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
