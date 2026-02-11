/**
 * @file Widow/Orphan Control Rendering Test
 *
 * Tests w:widowControl rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.44 (widowControl)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/widow-control", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("widow-control"), import.meta.url);
  });

  it("renders paragraph with widowControl=true", () => {
    expect(ctx.rendered.svg).toContain("widowControl=true");
  });

  it("renders paragraph with widowControl=false", () => {
    expect(ctx.rendered.svg).toContain("widowControl=false");
  });

  it("renders paragraph with no widowControl setting", () => {
    expect(ctx.rendered.svg).toContain("no widowControl setting");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("widow-control"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
