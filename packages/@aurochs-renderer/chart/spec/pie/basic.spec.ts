/**
 * @file Basic pie chart visual regression test
 *
 * @ecma376 21.2.2.141 pieChart (Pie Charts)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/basic.fixture";

type Context = { rendered: RenderedChartFixture };

describe("pie/basic", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders pie slice elements", () => {
    expect(ctx.rendered.svg).toContain("<path");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Pie Chart");
  });

  it("renders legend", () => {
    // Pie chart legend shows series name, not category labels
    expect(ctx.rendered.svg).toContain("Series 1");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("basic", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
