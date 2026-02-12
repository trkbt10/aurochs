/**
 * @file Doughnut chart visual regression test
 *
 * @ecma376 21.2.2.50 doughnutChart (Doughnut Charts)
 * @ecma376 21.2.2.72 holeSize (Hole Size)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/doughnut.fixture";

type Context = { rendered: RenderedChartFixture };

describe("pie/doughnut", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders doughnut slice elements", () => {
    expect(ctx.rendered.svg).toContain("<path");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Doughnut Chart");
  });

  it("renders legend", () => {
    // Doughnut chart legend shows series name, not category labels
    expect(ctx.rendered.svg).toContain("Series 1");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("doughnut", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
