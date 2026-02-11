/**
 * @file Vertical Align Rendering Test
 *
 * Tests w:vertAlign (subscript/superscript) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.42 (vertAlign)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/vertical-align", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("vertical-align"), import.meta.url);
  });

  it("renders subscript and superscript", () => {
    expect(rendered.svg).toContain("H");
    expect(rendered.svg).toContain("O");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("vertical-align"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
