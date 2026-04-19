/**
 * @file FigPageRenderer integration test — REAL .fig file path
 *
 * Uses createFigDesignDocument (the real fig-editor loading path) with the
 * frame-properties.fig fixture. This is exactly what the dev editor does
 * when a user opens a .fig file. Catches any FigDesignDocument-level bug
 * that demo-document-based tests miss.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { createFigDesignDocument } from "@aurochs-builder/fig";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { FigPageRenderer } from "./FigPageRenderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIG_FILE = path.resolve(
  __dirname,
  "../../../../@aurochs-renderer/fig/fixtures/frame-properties/frame-properties.fig",
);

// eslint-disable-next-line no-restricted-syntax -- initialized in beforeAll
let doc: FigDesignDocument;

beforeAll(async () => {
  const data = fs.readFileSync(FIG_FILE);
  doc = await createFigDesignDocument(new Uint8Array(data));
});

function renderFullPage(): string {
  const page = doc.pages[0];
  return renderToStaticMarkup(
    createElement(FigPageRenderer, {
      page,
      canvasWidth: 2400,
      canvasHeight: 600,
      images: doc.images,
      blobs: doc.blobs,
      symbolMap: doc.components,
      styleRegistry: doc.styleRegistry,
    }),
  );
}

describe("FigPageRenderer — real .fig file path (fig-editor production path)", () => {
  it("loads the fixture as a FigDesignDocument with the expected FRAMEs", () => {
    expect(doc.pages.length).toBeGreaterThan(0);
    const page = doc.pages[0];
    const names = page.children.map((c) => c.name);
    // frame-properties fixture contains these top-level FRAMEs
    for (const expected of [
      "frame-bg-fill", "frame-corner-clip", "frame-nested",
      "frame-drop-shadow", "frame-inner-shadow", "frame-stroke",
    ]) {
      expect(names, `FigDesignDocument should contain FRAME "${expected}"`).toContain(expected);
    }
  });

  it("FRAME fills survive createFigDesignDocument → FigPageRenderer", () => {
    const html = renderFullPage();
    // frame-bg-fill: {r:0.2,g:0.5,b:0.9} → #3380e6.
    expect(html, "frame-bg-fill's blue background must reach the DOM").toMatch(
      /fill="#3380e6"|fill="rgb\(51, ?128, ?230\)"/i,
    );
  });

  it("FRAME stroke survives (frame-stroke: stroke=#0d0d0d width=4)", () => {
    const html = renderFullPage();
    expect(html).toMatch(/stroke="#0d0d0d"/i);
    // INSIDE stroke → masked + 2× width = 8, or centred = 4.
    expect(html).toMatch(/stroke-width="[48]"/);
  });

  it("FRAME drop-shadow & inner-shadow produce <filter> elements", () => {
    const html = renderFullPage();
    expect(html, "frame-drop-shadow + frame-inner-shadow must produce filters").toMatch(/<filter\b/);
    // The canonical recipes must NOT use the alpha-binarize hack.
    expect(html).not.toContain("0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0");
  });

  it("FRAME cornerRadius survives (frame-corner-clip: cr=16)", () => {
    const html = renderFullPage();
    // rx=16 must appear on a frame-corner-clip rect.
    expect(html).toMatch(/rx="16"/);
  });

  it("nested FRAME fills both render", () => {
    const html = renderFullPage();
    // frame-nested has inner fill {r:0.9,g:0.3,b:0.3} → #e64d4d.
    expect(html).toMatch(/#e64d4d|rgb\(230, ?77, ?77\)/i);
  });

  it("does not leak strokeAlign as DOM attribute", () => {
    const html = renderFullPage();
    expect(html).not.toContain("strokeAlign=");
    expect(html).not.toContain("strokealign=");
  });

  it("emits SVG filter/clipPath elements in proper camelCase (NOT lowercased)", () => {
    // Browsers only recognise SVG filter/clipPath tags in the correct form.
    // If React lowercases them to <fefload>, <clippath> etc., the browser
    // treats them as unknown elements and no filtering/clipping happens —
    // this is exactly how FRAME decorations disappear on screen.
    const html = renderFullPage();
    // Must find the SVG camelCase form.
    expect(html, "feFlood must render as SVG camelCase tag").toMatch(/<feFlood\b/);
    expect(html, "feMerge must render as SVG camelCase tag").toMatch(/<feMerge\b/);
    expect(html, "feMergeNode must render as SVG camelCase tag").toMatch(/<feMergeNode\b/);
    expect(html, "clipPath must render as SVG camelCase tag").toMatch(/<clipPath\b/);
    // Must NOT find lowercased variants.
    expect(html).not.toMatch(/<feflood\b/);
    expect(html).not.toMatch(/<femerge\b/);
    expect(html).not.toMatch(/<clippath\b/);
  });
});
