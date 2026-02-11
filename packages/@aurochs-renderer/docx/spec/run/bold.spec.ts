/**
 * @file Bold Text Rendering Test
 *
 * Tests w:b (bold) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.1 (b)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/bold", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("bold"), import.meta.url);
  });

  it("renders bold text with font-weight 700", () => {
    expect(rendered.svg).toContain("bold");
    expect(rendered.svg).toMatch(/font-weight[=:]["']?700/);
  });

  it("renders non-bold text without font-weight attribute", () => {
    expect(rendered.svg).toContain("This is");
    // Non-bold text should not have font-weight="700"
    expect(rendered.svg).toMatch(/>This is <\/text>/);
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("bold"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
