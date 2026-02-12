/**
 * @file OHLC stock chart visual regression test
 *
 * @ecma376 21.2.2.200 stockChart (Stock Charts)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/ohlc.fixture";

type Context = { rendered: RenderedChartFixture };

describe("stock/ohlc", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders stock chart elements", () => {
    // Stock charts use lines and rects for hi-low and up-down bars
    expect(ctx.rendered.svg).toMatch(/<line|<rect|<path/);
  });

  it("renders category labels", () => {
    expect(ctx.rendered.svg).toContain("Day 1");
    expect(ctx.rendered.svg).toContain("Day 5");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Stock Chart (OHLC)");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("ohlc", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
