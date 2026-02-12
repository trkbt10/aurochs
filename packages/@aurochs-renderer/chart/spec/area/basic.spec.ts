/**
 * @file Basic area chart visual regression test
 *
 * @ecma376 21.2.2.3 areaChart (Area Charts)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/basic.fixture";

type Context = { rendered: RenderedChartFixture };

describe("area/basic", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders area fill elements", () => {
    expect(ctx.rendered.svg).toContain("<path");
  });

  it("renders category labels", () => {
    expect(ctx.rendered.svg).toContain("2020");
    expect(ctx.rendered.svg).toContain("2024");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Area Chart");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("basic", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
