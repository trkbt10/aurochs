/**
 * @file Table Cell Borders Rendering Test
 *
 * Tests w:tcBorders cell property.
 *
 * @see ECMA-376-1:2016 Section 17.4.66 (tcPr)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("table/table-cell-borders", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("table-cell-borders"), import.meta.url);
  });

  it("renders cell content", () => {
    expect(ctx.rendered.svg).toContain("Red border");
    expect(ctx.rendered.svg).toContain("Blue border");
  });

  it("renders cell border colors", () => {
    // Check that border colors are present in SVG
    expect(ctx.rendered.svg).toContain("#FF0000"); // Red
    expect(ctx.rendered.svg).toContain("#0000FF"); // Blue
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("table-cell-borders"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
