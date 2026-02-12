/**
 * @file Title Page Test
 *
 * Tests w:titlePg (different first page) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.6.19 (titlePg)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/title-page", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("title-page"), import.meta.url);
  });

  it("renders document content", () => {
    expect(ctx.rendered.svg).toContain("different first page");
  });

  it("documents titlePg configuration", () => {
    expect(ctx.rendered.svg).toContain("titlePg property");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("title-page"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
