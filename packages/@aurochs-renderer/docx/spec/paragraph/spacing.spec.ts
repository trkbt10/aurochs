/**
 * @file Paragraph Spacing Rendering Test
 *
 * Tests w:spacing (before/after) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.33 (spacing)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("paragraph/spacing", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("spacing-before-after"), import.meta.url);
  });

  it("renders paragraphs with spacing", () => {
    expect(rendered.svg).toContain("First paragraph");
    expect(rendered.svg).toContain("Paragraph with spacing");
    expect(rendered.svg).toContain("Third paragraph");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("spacing-before-after"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
