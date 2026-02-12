/**
 * @file Stacked bar chart visual regression test
 *
 * @ecma376 21.2.2.16 barChart (Bar Charts)
 * @ecma376 21.2.2.77 grouping (stacked)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/stacked.fixture";

type Context = { rendered: RenderedChartFixture };

describe("bar/stacked", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders stacked bar elements", () => {
    expect(ctx.rendered.svg).toContain("<rect");
  });

  it("renders category labels", () => {
    expect(ctx.rendered.svg).toContain("Q1");
    expect(ctx.rendered.svg).toContain("Q4");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Stacked Bar Chart");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("stacked", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
