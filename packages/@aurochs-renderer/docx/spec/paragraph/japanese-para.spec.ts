/**
 * @file Japanese Paragraph Rendering Test
 *
 * Tests Japanese text paragraph rendering.
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/japanese", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("japanese-para"), import.meta.url);
  });

  it("renders Japanese text", () => {
    expect(ctx.rendered.svg).toContain("日本語");
  });

  it("renders mixed Japanese and English", () => {
    expect(ctx.rendered.svg).toContain("English");
  });

  it("renders centered Japanese paragraph", () => {
    expect(ctx.rendered.svg).toContain("中央揃え");
    expect(ctx.rendered.pages[0].paragraphs[1].alignment).toBe("center");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("japanese-para"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
