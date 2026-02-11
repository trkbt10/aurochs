/**
 * @file Justify Alignment Rendering Test
 *
 * Tests w:jc both (justify) alignment.
 *
 * @see ECMA-376-1:2016 Section 17.3.1.13 (jc)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("paragraph/alignment-justify", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("alignment-justify"), import.meta.url);
  });

  it("renders justified text", () => {
    expect(rendered.svg).toContain("justified");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("alignment-justify"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
