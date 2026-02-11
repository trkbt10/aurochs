/**
 * @file Underline Text Rendering Test
 *
 * Tests w:u (underline) rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.40 (u)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/underline", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("underline"), import.meta.url);
  });

  it("renders underlined text", () => {
    expect(rendered.svg).toContain("underlined");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("underline"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
