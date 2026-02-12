/**
 * @file Theme Font Test
 *
 * Tests w:rFonts/@asciiTheme (theme font) rendering.
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

describe("run/theme-font", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("theme-font"), import.meta.url);
  });

  it("renders text with theme fonts", () => {
    expect(ctx.rendered.svg).toContain("major theme font");
    expect(ctx.rendered.svg).toContain("minor theme font");
  });

  it("applies theme font families", () => {
    // Theme fonts should resolve to actual font families
    // Major theme typically resolves to Cambria or similar
    // Minor theme typically resolves to Calibri or similar
    expect(ctx.rendered.svg).toMatch(/font-family/);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("theme-font"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
