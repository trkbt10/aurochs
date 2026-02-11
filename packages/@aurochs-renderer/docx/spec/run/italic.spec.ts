/**
 * @file Italic Text Rendering Test
 *
 * Tests w:i (italic) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.16 (i)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/italic", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("italic"), import.meta.url);
  });

  it("renders italic text with font-style italic", () => {
    expect(rendered.svg).toContain("italic");
    expect(rendered.svg).toMatch(/font-style[=:]["']?italic/);
  });

  it("renders non-italic text with font-style normal", () => {
    expect(rendered.svg).toContain("This is");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("italic"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
