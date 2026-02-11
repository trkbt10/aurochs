/**
 * @file Paragraph Alignment Rendering Test
 *
 * Tests w:jc (justification) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.13 (jc)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { loadAndRender, fixture, type RenderedFixture } from "../scripts/test-helper";

describe("paragraph/alignment", () => {
  describe("center", () => {
    let rendered: RenderedFixture;

    beforeAll(async () => {
      rendered = await loadAndRender(fixture("alignment-center"), import.meta.url);
    });

    it("renders centered text", () => {
      expect(rendered.svg).toContain("Centered text");
    });

    it("applies center alignment to paragraph", () => {
      expect(rendered.pages[0].paragraphs[0].alignment).toBe("center");
    });
  });
});
