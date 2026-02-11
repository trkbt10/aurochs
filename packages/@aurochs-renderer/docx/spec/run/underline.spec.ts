/**
 * @file Underline Text Rendering Test
 *
 * Tests w:u (underline) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.40 (u)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/underline", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("underline"), import.meta.url);
  });

  it("renders underlined text", () => {
    expect(ctx.rendered.svg).toContain("underlined");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("underline"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
