/**
 * @file Text Effects Rendering Test
 *
 * Tests w:emboss, w:imprint, w:outline, w:shadow rendering.
 *
 * Note: These effects are complex visual effects that may not render
 * identically in SVG. Basic tests verify the DOCX is generated correctly.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.13 (emboss)
 * @see ECMA-376-1:2016 Section 17.3.2.17 (imprint)
 * @see ECMA-376-1:2016 Section 17.3.2.23 (outline)
 * @see ECMA-376-1:2016 Section 17.3.2.31 (shadow)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("run/text-effects", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("text-effects"), import.meta.url);
  });

  it("renders emboss text", () => {
    expect(ctx.rendered.svg).toContain("Emboss");
  });

  it("renders imprint text", () => {
    expect(ctx.rendered.svg).toContain("Imprint");
  });

  it("renders outline text", () => {
    expect(ctx.rendered.svg).toContain("Outline");
  });

  it("renders shadow text", () => {
    expect(ctx.rendered.svg).toContain("Shadow");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("text-effects"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
