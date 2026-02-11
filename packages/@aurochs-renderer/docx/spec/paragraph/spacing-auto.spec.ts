/**
 * @file Paragraph Auto Spacing Rendering Test
 *
 * Tests w:spacing@beforeAutospacing and w:spacing@afterAutospacing rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.33 (spacing)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/spacing-auto", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("spacing-auto"), import.meta.url);
  });

  it("renders paragraph with beforeAutospacing", () => {
    expect(ctx.rendered.svg).toContain("beforeAutospacing=true");
  });

  it("renders paragraph with afterAutospacing", () => {
    expect(ctx.rendered.svg).toContain("afterAutospacing=true");
  });

  it("renders paragraph with both auto spacing options", () => {
    expect(ctx.rendered.svg).toContain("both before and after autospacing");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("spacing-auto"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
