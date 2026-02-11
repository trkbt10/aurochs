/**
 * @file Vertical Align Rendering Test
 *
 * Tests w:vertAlign (subscript/superscript) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.42 (vertAlign)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/vertical-align", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("vertical-align"), import.meta.url);
  });

  it("renders subscript and superscript", () => {
    expect(ctx.rendered.svg).toContain("H");
    expect(ctx.rendered.svg).toContain("O");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("vertical-align"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
