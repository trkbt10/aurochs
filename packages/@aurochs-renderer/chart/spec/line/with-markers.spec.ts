/**
 * @file Line chart with markers visual regression test
 *
 * @ecma376 21.2.2.97 lineChart (Line Charts)
 * @ecma376 21.2.2.105 marker (Marker)
 */

import {
  renderChartFixture,
  baselinePath,
  compareToBaseline,
  type RenderedChartFixture,
} from "../scripts/test-helper";
import { chart } from "./fixtures/with-markers.fixture";

type Context = { rendered: RenderedChartFixture };

describe("line/with-markers", () => {
  const ctx: Context = {} as Context;

  beforeAll(() => {
    ctx.rendered = renderChartFixture(chart);
  });

  it("renders line elements", () => {
    expect(ctx.rendered.svg).toContain("<path");
  });

  it("renders marker elements", () => {
    // Markers are rendered as circles or other shapes
    expect(ctx.rendered.svg).toMatch(/<circle|<rect|<polygon/);
  });

  it("renders category labels", () => {
    expect(ctx.rendered.svg).toContain("Jan");
    expect(ctx.rendered.svg).toContain("Jun");
  });

  it("renders chart title", () => {
    expect(ctx.rendered.svg).toContain("Line Chart with Markers");
  });

  it("matches baseline", () => {
    const baseline = baselinePath("with-markers", import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, {
      maxDiffPercent: 5,
    });
    expect(result.match).toBe(true);
  });
});
