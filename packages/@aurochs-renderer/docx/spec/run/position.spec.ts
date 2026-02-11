/**
 * @file Position (Raise/Lower) Rendering Test
 *
 * Tests w:position (vertical position adjustment) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.24 (position)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/position", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("position"), import.meta.url);
  });

  it("renders raised and lowered text", () => {
    expect(ctx.rendered.svg).toContain("Raised");
    expect(ctx.rendered.svg).toContain("Lowered");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("position"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
