/**
 * @file Header/Footer Margin Rendering Test
 *
 * Tests w:pgMar header and footer attributes.
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

describe("section/header-footer-margins", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("header-footer-margins"), import.meta.url);
  });

  it("renders content text", () => {
    expect(ctx.rendered.svg).toContain("0.5 inch header and footer margins");
    expect(ctx.rendered.svg).toContain("header space is 720 twips");
    expect(ctx.rendered.svg).toContain("footer space is 720 twips");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("header-footer-margins"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
