/**
 * @file Caps Rendering Test
 *
 * Tests w:caps and w:smallCaps rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.5 (caps), 17.3.2.33 (smallCaps)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/caps", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("caps"), import.meta.url);
  });

  it("renders caps text", () => {
    expect(ctx.rendered.svg).toBeDefined();
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("caps"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
