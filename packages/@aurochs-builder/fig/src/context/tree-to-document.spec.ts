/**
 * @file Tests for raw FigNode to FigDesignNode conversion
 */

import { convertFigNode, treeToDocument } from "./tree-to-document";
import type { FigNode, FigPaint } from "@aurochs/fig/types";
import type { LoadedFigFile } from "@aurochs/fig/roundtrip";

const RED_PAINT: FigPaint = {
  type: "SOLID",
  color: { r: 1, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true,
};

const BLUE_PAINT: FigPaint = {
  type: "SOLID",
  color: { r: 0, g: 0, b: 1, a: 1 },
  opacity: 1,
  visible: true,
};

function createFrameNode(fields: Partial<FigNode>): FigNode {
  return {
    guid: { sessionID: 1, localID: 2 },
    phase: { value: 1, name: "CREATED" },
    type: { value: 3, name: "FRAME" },
    name: "Frame",
    ...fields,
  };
}

function createCanvasNode(fields: Partial<FigNode>): FigNode {
  return {
    guid: { sessionID: 1, localID: 10 },
    phase: { value: 1, name: "CREATED" },
    type: { value: 2, name: "CANVAS" },
    name: "Canvas",
    ...fields,
  };
}

function createLoaded(): LoadedFigFile {
  return {
    schema: { definitions: [] },
    compressedSchema: new Uint8Array(),
    version: "0",
    nodeChanges: [],
    blobs: [],
    images: new Map(),
    metadata: null,
    thumbnail: null,
    messageHeader: {},
  };
}

describe("convertFigNode", () => {
  it("maps frame backgroundPaints into domain fills", () => {
    const node = createFrameNode({ backgroundPaints: [RED_PAINT] });
    const converted = convertFigNode(node, new Map());

    expect(converted.fills).toEqual([RED_PAINT]);
    expect(converted._raw?.backgroundPaints).toBeUndefined();
  });

  it("keeps fillPaints fallback for builder-generated frames", () => {
    const node = createFrameNode({ fillPaints: [BLUE_PAINT] });
    const converted = convertFigNode(node, new Map());

    expect(converted.fills).toEqual([BLUE_PAINT]);
  });
});

describe("treeToDocument page visibility", () => {
  it("hides canvas pages using Kiwi visibility metadata instead of page names", () => {
    const visible = createCanvasNode({ guid: { sessionID: 1, localID: 11 }, name: "Internal Only Canvas" });
    const hiddenByFlag = createCanvasNode({
      guid: { sessionID: 1, localID: 12 },
      name: "Visible-looking name",
      internalOnly: true,
    });
    const hiddenByVisibility = createCanvasNode({
      guid: { sessionID: 1, localID: 13 },
      name: "Another page",
      visible: false,
    });
    const documentNode: FigNode = {
      guid: { sessionID: 1, localID: 1 },
      phase: { value: 1, name: "CREATED" },
      type: { value: 1, name: "DOCUMENT" },
      name: "Document",
      children: [visible, hiddenByFlag, hiddenByVisibility],
    };

    const doc = treeToDocument({ roots: [documentNode], nodeMap: new Map() }, createLoaded());

    expect(doc.pages.map((page) => page.name)).toEqual(["Internal Only Canvas"]);
  });
});
