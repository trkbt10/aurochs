/**
 * @file Paragraph Text Direction Rendering Test
 *
 * Tests w:textDirection rendering.
 *
 * @see ECMA-376-1:2016 Section 17.18.93 (ST_TextDirection)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/text-direction", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("text-direction"), import.meta.url);
  });

  it("renders paragraph with lrTb text direction", () => {
    expect(ctx.rendered.svg).toContain("lrTb");
  });

  it("renders paragraph with tbRl text direction", () => {
    expect(ctx.rendered.svg).toContain("tbRl");
  });

  it("renders paragraph with btLr text direction", () => {
    expect(ctx.rendered.svg).toContain("btLr");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("text-direction"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
