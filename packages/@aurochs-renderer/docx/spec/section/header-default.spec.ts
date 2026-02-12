/**
 * @file Default Header Test
 *
 * Tests w:headerReference (default header) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.10.5 (headerReference)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("section/header-default", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("header-default"), import.meta.url);
  });

  it("renders document body content", () => {
    expect(ctx.rendered.svg).toContain("Document with default header");
  });

  it("renders header content", () => {
    // Header should contain the company name
    expect(ctx.rendered.svg).toContain("Company Name");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("header-default"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
