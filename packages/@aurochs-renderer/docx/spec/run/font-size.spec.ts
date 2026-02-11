/**
 * @file Font Size Rendering Test
 *
 * Tests w:sz (font size) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.38 (sz)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/font-size", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("font-size"), import.meta.url);
  });

  it("renders text with different font sizes", () => {
    expect(rendered.svg).toContain("Small");
    expect(rendered.svg).toContain("Medium");
    expect(rendered.svg).toContain("Large");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("font-size"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
