/**
 * @file Character Spacing Rendering Test
 *
 * Tests w:spacing (character spacing) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.35 (spacing)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/letter-spacing", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("letter-spacing"), import.meta.url);
  });

  it("renders expanded text with positive letter-spacing", () => {
    expect(ctx.rendered.svg).toMatch(/letter-spacing="[0-9.]+px"/);
  });

  it("renders condensed text with negative letter-spacing", () => {
    expect(ctx.rendered.svg).toMatch(/letter-spacing="-[0-9.]+px"/);
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("letter-spacing"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
