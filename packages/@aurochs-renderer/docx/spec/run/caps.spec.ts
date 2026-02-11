/**
 * @file Caps Rendering Test
 *
 * Tests w:caps and w:smallCaps rendering.
 *
 * @see ECMA-376-1:2016 Section 17.3.2.5 (caps), 17.3.2.33 (smallCaps)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  loadAndRender,
  fixture,
  baselinePath,
  compareToBaseline,
  type RenderedFixture,
} from "../scripts/test-helper";

describe("run/caps", () => {
  let rendered: RenderedFixture;

  beforeAll(async () => {
    rendered = await loadAndRender(fixture("caps"), import.meta.url);
  });

  it("renders caps text", () => {
    expect(rendered.svg).toBeDefined();
  });

  it("matches LibreOffice baseline", () => {
    const baseline = baselinePath(fixture("caps"), import.meta.url);
    const result = compareToBaseline(rendered.svg, baseline, { maxDiffPercent: 5 });
    expect(result.match).toBe(true);
  });
});
