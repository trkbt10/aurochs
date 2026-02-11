/**
 * @file Hebrew Numbering Rendering Test
 *
 * Tests w:numPr with Hebrew (RTL) numbering format.
 *
 * @see ECMA-376-1:2016 Section 17.9 (Numbering)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("numbering/hebrew-numbering", () => {
  const ctx: Context = {} as Context;

  beforeAll(async () => {
    ctx.rendered = await loadAndRender(fixture("hebrew-numbering"), import.meta.url);
  });

  it("renders Hebrew list items", () => {
    expect(ctx.rendered.svg).toContain("פריט ראשון");
    expect(ctx.rendered.svg).toContain("פריט שני");
    expect(ctx.rendered.svg).toContain("פריט שלישי");
  });

  it("renders Hebrew list header", () => {
    expect(ctx.rendered.svg).toContain("רשימה עברית");
  });

  it("renders page correctly", () => {
    const baseline = baselinePath(fixture("hebrew-numbering"), import.meta.url);
    const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 10 });
    expect(result.match).toBe(true);
  });
});
