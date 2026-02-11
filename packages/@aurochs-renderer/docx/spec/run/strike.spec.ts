/**
 * @file Strikethrough Text Rendering Test
 *
 * Tests w:strike (strikethrough) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.37 (strike)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/strike", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("strike"), import.meta.url);
  });

  it("renders strikethrough text", () => {
    expect(rendered.svg).toContain("strikethrough");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("strike"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
