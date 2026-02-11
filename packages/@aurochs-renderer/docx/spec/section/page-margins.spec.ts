/**
 * @file Page Margins Rendering Test
 *
 * Tests w:pgMar page margins properties (top, bottom, left, right).
 *
 * @see ECMA-376-1:2016 Section 17.6.11 (pgMar)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/page-margins", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("page-margins"), import.meta.url);
  });

  it("renders page margins content", () => {
    expect(ctx.rendered.svg).toContain("2-inch margins");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("page-margins"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
