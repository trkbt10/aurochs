/**
 * @file Left Alignment Rendering Test
 *
 * Tests w:jc left alignment.
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

describe("paragraph/alignment-left", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("alignment-left"), import.meta.url);
  });

  it("renders left aligned text", () => {
    expect(rendered.svg).toContain("Left aligned");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("alignment-left"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
