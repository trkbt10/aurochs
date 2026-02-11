/**
 * @file Mixed Bidirectional Text Rendering Test
 *
 * Tests mixed LTR and RTL text (Arabic, Hebrew) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.30 (rtl)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/mixed-bidi", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("mixed-bidi"), import.meta.url);
  });

  it("renders mixed bidirectional text", () => {
    expect(ctx.rendered.svg).toContain("English");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("mixed-bidi"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
