/**
 * @file Outline Level Rendering Test
 *
 * Tests w:outlineLvl rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.20 (outlineLvl)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/outline-level", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("outline-level"), import.meta.url);
  });

  it("renders paragraph with outline level 0", () => {
    expect(ctx.rendered.svg).toContain("Outline Level 0");
  });

  it("renders paragraph with outline level 1", () => {
    expect(ctx.rendered.svg).toContain("Outline Level 1");
  });

  it("renders paragraph with outline level 2", () => {
    expect(ctx.rendered.svg).toContain("Outline Level 2");
  });

  it("renders paragraph with no outline level (body text)", () => {
    expect(ctx.rendered.svg).toContain("no outline level");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("outline-level"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
