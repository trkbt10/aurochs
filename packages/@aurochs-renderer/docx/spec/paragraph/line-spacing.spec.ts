/**
 * @file Line Spacing Rendering Test
 *
 * Tests w:spacing/@line rendering.
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

describe("paragraph/line-spacing", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("line-spacing"), import.meta.url);
  });

  it("renders paragraph with line spacing", () => {
    expect(rendered.svg).toContain("Double spaced");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("line-spacing"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
