/**
 * @file Basic bubble chart visual regression test
 *
 * @ecma376 21.2.2.20 bubbleChart (Bubble Charts)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/basic.fixture";

type Context = { rendered: RenderedChartFixture };

describe("bubble/basic", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders bubble elements", () => {
    expect(ctx.rendered.svg).toContain("<circle");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Bubble Chart");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("basic", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
