/**
 * @file Multi-level List Rendering Test
 *
 * Tests w:numPr with multiple indent levels.
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

describe("numbering/multilevel-list", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("multilevel-list"), import.meta.url);
  });

  it("renders all level items", () => {
    expect(ctx.rendered.svg).toContain("Level 1 - First item");
    expect(ctx.rendered.svg).toContain("Level 2 - Sub item a");
    expect(ctx.rendered.svg).toContain("Level 3 - Sub sub item i");
    expect(ctx.rendered.svg).toContain("Level 2 - Sub item b");
    expect(ctx.rendered.svg).toContain("Level 1 - Second item");
  });

  it("renders level 1 decimal markers", () => {
    expect(ctx.rendered.svg).toContain("1.");
    expect(ctx.rendered.svg).toContain("2.");
  });

  it("renders level 2 letter markers", () => {
    expect(ctx.rendered.svg).toContain("a)");
    expect(ctx.rendered.svg).toContain("b)");
  });

  it("renders level 3 roman markers", () => {
    expect(ctx.rendered.svg).toContain("i.");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("multilevel-list"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
