/**
 * @file Indentation Rendering Test
 *
 * Tests w:ind (left, firstLine, hanging) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.12 (ind)
 */

import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

type Context = { rendered: RenderedFixture };

describe("paragraph/indent", () => {
  describe("left indent", () => {
    const ctx: Context = {} as Context;

    beforeAll(async () => {
      ctx.rendered = await loadAndRender(fixture("indent-left"), import.meta.url);
    });

    it("renders indented paragraph", () => {
      expect(ctx.rendered.svg).toContain("Indented paragraph");
    });

    it("renders page correctly", () => {
      const baseline = baselinePath(fixture("indent-left"), import.meta.url);
      const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });

  describe("first line indent", () => {
    const ctx: Context = {} as Context;

    beforeAll(async () => {
      ctx.rendered = await loadAndRender(fixture("indent-first-line"), import.meta.url);
    });

    it("renders first line indent", () => {
      expect(ctx.rendered.svg).toContain("first line indent");
    });

    it("renders page correctly", () => {
      const baseline = baselinePath(fixture("indent-first-line"), import.meta.url);
      const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });

  describe("hanging indent", () => {
    const ctx: Context = {} as Context;

    beforeAll(async () => {
      ctx.rendered = await loadAndRender(fixture("indent-hanging"), import.meta.url);
    });

    it("renders hanging indent", () => {
      expect(ctx.rendered.svg).toContain("hanging indent");
    });

    it("renders page correctly", () => {
      const baseline = baselinePath(fixture("indent-hanging"), import.meta.url);
      const result = compareToBaseline(ctx.rendered.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });
});
