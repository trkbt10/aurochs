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

function decodeRenderedSvgBackend(html: string): string {
  const srcMatch = html.match(/<img[^>]+\bsrc="([^"]+)"/);
  expect(srcMatch, "FigPageRenderer must consume the SVG backend as an image layer").not.toBeNull();

  const src = srcMatch![1].replace(/&amp;/g, "&");
  const prefix = "data:image/svg+xml;charset=utf-8,";
  expect(src.startsWith(prefix), "SVG backend image layer must use an encoded SVG data URL").toBe(true);
  return decodeURIComponent(src.slice(prefix.length));
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
    const svg = decodeRenderedSvgBackend(renderFullPage());
    // frame-bg-fill: {r:0.2,g:0.5,b:0.9} → #3380e6.
    expect(svg, "frame-bg-fill's blue background must reach the SVG backend output").toMatch(
      /fill="#3380e6"|fill="rgb\(51, ?128, ?230\)"/i,
    );
  });

  it("FRAME stroke survives (frame-stroke: stroke=#0d0d0d width=4)", () => {
    const svg = decodeRenderedSvgBackend(renderFullPage());
    expect(svg).toMatch(/stroke="#0d0d0d"/i);
    // INSIDE stroke → masked + 2× width = 8, or centred = 4.
    expect(svg).toMatch(/stroke-width="[48]"/);
  });

  it("FRAME drop-shadow & inner-shadow produce <filter> elements", () => {
    const svg = decodeRenderedSvgBackend(renderFullPage());
    expect(svg, "frame-drop-shadow + frame-inner-shadow must produce filters").toMatch(/<filter\b/);
    // The SVG backend intentionally mirrors Figma export's hardAlpha
    // drop-shadow recipe.
    expect(svg).toContain("0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0");
  });

  it("FRAME cornerRadius survives (frame-corner-clip: cr=16)", () => {
    const svg = decodeRenderedSvgBackend(renderFullPage());
    // Rounded frames are normalized to paths in the shared shape pipeline.
    expect(svg).toMatch(/M 16 0 L 134 0 C/);
  });

  it("nested FRAME fills both render", () => {
    const svg = decodeRenderedSvgBackend(renderFullPage());
    // frame-nested has inner fill {r:0.9,g:0.3,b:0.3} → #e64d4d.
    expect(svg).toMatch(/#e64d4d|rgb\(230, ?77, ?77\)/i);
  });

  it("does not leak strokeAlign as DOM attribute", () => {
    const svg = decodeRenderedSvgBackend(renderFullPage());
    expect(svg).not.toContain("strokeAlign=");
    expect(svg).not.toContain("strokealign=");
  });

  it("emits SVG filter/clipPath elements in proper camelCase (NOT lowercased)", () => {
    // Browsers only recognise SVG filter/clipPath tags in the correct form.
    // If React lowercases them to <fefload>, <clippath> etc., the browser
    // treats them as unknown elements and no filtering/clipping happens —
    // this is exactly how FRAME decorations disappear on screen.
    const svg = decodeRenderedSvgBackend(renderFullPage());
    // Must find the SVG camelCase form.
    expect(svg, "feFlood must render as SVG camelCase tag").toMatch(/<feFlood\b/);
    expect(svg, "feMerge must render as SVG camelCase tag").toMatch(/<feMerge\b/);
    expect(svg, "feMergeNode must render as SVG camelCase tag").toMatch(/<feMergeNode\b/);
    expect(svg, "clipPath must render as SVG camelCase tag").toMatch(/<clipPath\b/);
    // Must NOT find lowercased variants.
    expect(svg).not.toMatch(/<feflood\b/);
    expect(svg).not.toMatch(/<femerge\b/);
    expect(svg).not.toMatch(/<clippath\b/);
  });
});
