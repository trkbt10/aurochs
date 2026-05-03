/** @file Scene graph text font resolver integration tests. */

import type { FigDesignNode, FigNodeId } from "@aurochs/fig/domain";
import { EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import type { AbstractFont, FontPath } from "../font/types";
import type { TextNode } from "./types";
import { buildSceneGraph } from "./builder";
import { resolveRenderTree } from "./render-tree";

const RECT_PATH: FontPath = {
  commands: [
    { type: "M", x: 0, y: 0 },
    { type: "L", x: 10, y: 0 },
    { type: "L", x: 10, y: 10 },
    { type: "L", x: 0, y: 10 },
    { type: "Z" },
  ],
  toPathData: () => "M0 0L10 0L10 10L0 10Z",
};

const FONT: AbstractFont = {
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  charToGlyph: () => ({
    index: 1,
    advanceWidth: 500,
    getPath: () => RECT_PATH,
  }),
  getPath: () => RECT_PATH,
};

function makeTextNode(): FigDesignNode {
  return {
    id: "text" as FigNodeId,
    type: "TEXT",
    name: "Text",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: { x: 200, y: 80 },
    fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    textData: {
      characters: "Hello",
      fontSize: 20,
      fontName: { family: "Unit Test Sans", style: "Regular" },
      textAlignHorizontal: { name: "LEFT", value: 0 },
      textAlignVertical: { name: "TOP", value: 0 },
    },
  };
}

function makeWrappingTextNode(): FigDesignNode {
  return {
    ...makeTextNode(),
    id: "wrapping-text" as FigNodeId,
    size: { x: 60, y: 120 },
    textData: {
      characters: "Hello World Wide",
      fontSize: 16,
      fontName: { family: "Unit Test Sans", style: "Regular" },
      textAlignHorizontal: { name: "LEFT", value: 0 },
      textAlignVertical: { name: "TOP", value: 0 },
      textAutoResize: { name: "NONE", value: 2 },
    },
  };
}

describe("buildSceneGraph text font resolver", () => {
  it("promotes explicit cached font outlines into the renderer-neutral text node", () => {
    const sceneGraph = buildSceneGraph([makeTextNode()], {
      blobs: [],
      images: new Map(),
      canvasSize: { width: 300, height: 200 },
      viewport: { x: 0, y: 0, width: 300, height: 200 },
      symbolMap: new Map(),
      styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
      showHiddenNodes: false,
      warnings: [],
      textFontResolver: () => FONT,
    });
    const text = sceneGraph.root.children[0] as TextNode;
    const renderTree = resolveRenderTree(sceneGraph);
    const renderText = renderTree.children[0];

    expect(text.glyphContours?.length).toBe(1);
    expect(text.textLineLayout?.lines[0]?.text).toBe("Hello");
    expect(renderText?.type).toBe("text");
    if (renderText?.type !== "text") {
      return;
    }
    expect(renderText.content.mode).toBe("glyphs");
  });

  it("keeps wrapped line layout as the shared SceneGraph/RenderTree source for SVG and WebGL", () => {
    const sceneGraph = buildSceneGraph([makeWrappingTextNode()], {
      blobs: [],
      images: new Map(),
      canvasSize: { width: 300, height: 200 },
      viewport: { x: 0, y: 0, width: 300, height: 200 },
      symbolMap: new Map(),
      styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
      showHiddenNodes: false,
      warnings: [],
      textFontResolver: undefined,
    });
    const text = sceneGraph.root.children[0] as TextNode;
    const renderTree = resolveRenderTree(sceneGraph);
    const renderText = renderTree.children[0];
    const lineTexts = text.textLineLayout?.lines.map((line) => line.text);

    expect(lineTexts).toEqual(["Hello", "World", "Wide"]);
    expect(renderText?.type).toBe("text");
    if (renderText?.type !== "text") {
      return;
    }
    if (renderText.content.mode !== "lines") {
      throw new Error(`Expected text lines mode, got ${renderText.content.mode}`);
    }
    expect(renderText.content.layout.lines.map((line) => line.text)).toEqual(lineTexts);
    expect(renderText.sourceTextLineLayout?.lines.map((line) => line.text)).toEqual(lineTexts);
  });
});
