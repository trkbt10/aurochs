/**
 * @file Bullet List Rendering Test
 *
 * Tests w:numPr with bullet numbering.
 *
 * @see ECMA-376-1:2016 Section 17.9 (Numbering)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("numbering/bullet-list", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("bullet-list"), import.meta.url);
  });

  it("renders bullet list items", () => {
    expect(ctx.rendered.svg).toContain("First item");
    expect(ctx.rendered.svg).toContain("Second item");
    expect(ctx.rendered.svg).toContain("Third item");
  });

  it("renders bullet markers", () => {
    // Bullet character should appear in the SVG
    expect(ctx.rendered.svg).toContain("•");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("bullet-list"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
