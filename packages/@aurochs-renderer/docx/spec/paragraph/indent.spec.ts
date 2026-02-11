/**
 * @file Indentation Rendering Test
 *
 * Tests w:ind (left, firstLine, hanging) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.12 (ind)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("paragraph/indent", () => {
  describe("left indent", () => {
    let rendered: RenderedFixture;

    beforeAll(async () => {
      rendered = await loadAndRender(fixture("indent-left"), import.meta.url);
    });

    it("renders indented paragraph", () => {
      expect(rendered.svg).toContain("Indented paragraph");
    });

    it("matches LibreOffice baseline", () => {
      const baseline = baselinePath(fixture("indent-left"), import.meta.url);
      const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });

  describe("first line indent", () => {
    let rendered: RenderedFixture;

    beforeAll(async () => {
      rendered = await loadAndRender(fixture("indent-first-line"), import.meta.url);
    });

    it("renders first line indent", () => {
      expect(rendered.svg).toContain("first line indent");
    });

    it("matches LibreOffice baseline", () => {
      const baseline = baselinePath(fixture("indent-first-line"), import.meta.url);
      const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });

  describe("hanging indent", () => {
    let rendered: RenderedFixture;

    beforeAll(async () => {
      rendered = await loadAndRender(fixture("indent-hanging"), import.meta.url);
    });

    it("renders hanging indent", () => {
      expect(rendered.svg).toContain("hanging indent");
    });

    it("matches LibreOffice baseline", () => {
      const baseline = baselinePath(fixture("indent-hanging"), import.meta.url);
      const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
      expect(result.match).toBe(true);
    });
  });
});
