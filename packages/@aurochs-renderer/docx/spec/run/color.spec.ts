/**
 * @file Text Color Rendering Test
 *
 * Tests w:color rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.6 (color)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/color", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("color"), import.meta.url);
  });

  it("renders colored text", () => {
    expect(rendered.svg).toContain("Red");
    expect(rendered.svg).toContain("Green");
    expect(rendered.svg).toContain("Blue");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("color"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
