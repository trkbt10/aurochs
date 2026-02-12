/**
 * @file Horizontal bar chart visual regression test
 *
 * @ecma376 21.2.2.16 barChart (Bar Charts)
 * @ecma376 21.2.2.17 barDir (bar = horizontal)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/horizontal.fixture";

type Context = { rendered: RenderedChartFixture };

describe("bar/horizontal", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders horizontal bar elements", () => {
    expect(ctx.rendered.svg).toContain("<rect");
  });

  it("renders category labels", () => {
    expect(ctx.rendered.svg).toContain("Product A");
    expect(ctx.rendered.svg).toContain("Product D");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Horizontal Bar Chart");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("horizontal", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
