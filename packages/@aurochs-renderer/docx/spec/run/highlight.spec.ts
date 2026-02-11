/**
 * @file Highlight Rendering Test
 *
 * Tests w:highlight rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.15 (highlight)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/highlight", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("highlight"), import.meta.url);
  });

  it("renders highlighted text", () => {
    expect(rendered.svg).toContain("highlighted");
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("highlight"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
