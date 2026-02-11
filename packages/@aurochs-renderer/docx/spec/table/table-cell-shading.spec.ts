/**
 * @file Table Cell Shading Rendering Test
 *
 * Tests cell shading property (w:shd).
 *
 * @see ECMA-376-1:2016 Section 17.4.31 (shd)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-cell-shading", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-cell-shading"), import.meta.url);
  });

  it("renders cell content", () => {
    expect(ctx.rendered.svg).toContain("Red");
    expect(ctx.rendered.svg).toContain("Green");
    expect(ctx.rendered.svg).toContain("Blue");
    expect(ctx.rendered.svg).toContain("Yellow");
  });

  it("renders background colors", () => {
    expect(ctx.rendered.svg).toContain("#FFCCCC"); // Light red
    expect(ctx.rendered.svg).toContain("#CCFFCC"); // Light green
    expect(ctx.rendered.svg).toContain("#CCCCFF"); // Light blue
    expect(ctx.rendered.svg).toContain("#FFFFCC"); // Light yellow
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-cell-shading"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
