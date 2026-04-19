/**
 * @file FigPageRenderer integration test
 *
 * Ensures that the real fig-editor rendering component (FigPageRenderer)
 * emits FRAME fills / stroke / effects in its React output when rendering
 * the demo document. Catches regressions where decorations silently stop
 * rendering in the editor canvas.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
// eslint-disable-next-line custom/no-builder-import-in-renderer -- spec file: validate editor rendering against demo
import { createDemoFigDesignDocument } from "@aurochs-builder/fig/context";
import type { FigDesignDocument, FigPage } from "@aurochs/fig/domain";
import { FigPageRenderer } from "./FigPageRenderer";

// eslint-disable-next-line no-restricted-syntax -- initialized in beforeAll
let doc: FigDesignDocument;

beforeAll(async () => {
  doc = await createDemoFigDesignDocument();
});

function renderPage(page: FigPage, w: number, h: number): string {
  return renderToStaticMarkup(
    createElement(FigPageRenderer, {
      page,
      canvasWidth: w,
      canvasHeight: h,
      images: doc.images,
      blobs: doc.blobs,
      symbolMap: doc.components,
      styleRegistry: doc.styleRegistry,
    }),
  );
}

describe("FigPageRenderer — FRAME decoration reaches React DOM", () => {
  it("renders FRAME .background(WHITE) as a #ffffff fill rect", () => {
    const html = renderPage(doc.pages[0], 1200, 800);
    // The demo Page 0 "Shapes & Fills" has multiple FRAMEs each with
    // .background(WHITE). At least one #ffffff fill must appear.
    expect(html).toMatch(/<rect[^>]+fill="#ffffff"/i);
  });

  it("renders gradient fills as <linearGradient> or <radialGradient> defs", () => {
    const html = renderPage(doc.pages[0], 1200, 800);
    expect(html).toMatch(/<(linearGradient|radialGradient)\b/);
  });

  it("renders effects as <filter> with canonical inner-shadow primitives", () => {
    // Page 2 (Components & Effects) has drop-shadow / inner-shadow nodes.
    const html = renderPage(doc.pages[2], 1200, 800);
    expect(html, "filter element must appear when effects are present").toMatch(/<filter\b/);
    // The previously-broken ALPHA_BINARIZE_MATRIX must not appear.
    expect(html).not.toContain("0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0");
  });

  it("does not emit unknown strokeAlign prop onto DOM elements", () => {
    const html = renderPage(doc.pages[0], 1200, 800);
    // strokeAlign is scene-graph metadata (INSIDE/OUTSIDE), not an SVG
    // attribute. It must never reach the DOM where it would trigger
    // React's "unknown prop" warning and clutter the HTML with garbage.
    expect(html, "strokeAlign must never appear as a DOM attribute").not.toContain("strokeAlign=");
    expect(html).not.toContain("strokealign=");
  });
});
