/**
 * @file Kiwi encoding integration tests for gradient and auto-layout paints
 *
 * These tests verify that builder-produced Paint objects successfully
 * encode through the Kiwi binary encoder. Each test builds a minimal
 * .fig file containing the specific feature and asserts the binary
 * output is non-empty (i.e., encoding didn't throw).
 *
 * This catches mismatches between the builder's output and the Kiwi
 * schema (e.g., using field names the schema doesn't define).
 */

import {
  createFigFile,
  frameNode,
  roundedRectNode,
  ellipseNode,
  linearGradient,
  radialGradient,
  angularGradient,
  diamondGradient,
  symbolNode,
  instanceNode,
  textNode,
} from "@aurochs/fig/builder";

const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const BLUE = { r: 0.24, g: 0.47, b: 0.85, a: 1 };
const PURPLE = { r: 0.55, g: 0.30, b: 0.85, a: 1 };
const ORANGE = { r: 0.95, g: 0.55, b: 0.15, a: 1 };
const RED = { r: 0.90, g: 0.25, b: 0.25, a: 1 };
const LIGHT_GRAY = { r: 0.92, g: 0.92, b: 0.93, a: 1 };

function setup() {
  const figFile = createFigFile();
  const docID = figFile.addDocument("Test");
  return { figFile, docID };
}

function addFrameAndBuild(opts: {
  figFile: ReturnType<typeof createFigFile>;
  docID: number;
  canvasID: number;
  addContent: (frameID: number) => void;
}) {
  const { figFile, docID, canvasID, addContent } = opts;
  const frameID = 10;
  figFile.addFrame(
    frameNode(frameID, canvasID)
      .name("Frame")
      .size(200, 200)
      .position(0, 0)
      .background(WHITE)
      .clipsContent(true)
      .exportAsSVG()
      .build(),
  );
  addContent(frameID);
  figFile.addInternalCanvas(docID);
  return figFile.buildAsync({ fileName: "test" });
}

describe("Kiwi encoding: gradient fills", () => {
  it("encodes linear gradient with default stops", async () => {
    const { figFile, docID } = setup();
    const canvasID = figFile.addCanvas(docID, "Page");
    const buf = await addFrameAndBuild({ figFile, docID, canvasID, addContent: (fid) => {
      figFile.addRoundedRectangle(
        roundedRectNode(11, fid).name("R").size(80, 80).position(10, 10)
          .fill(linearGradient().build()).cornerRadius(8).build(),
      );
    }});
    expect(buf.byteLength).toBeGreaterThan(0);
  }, 30_000);

  it("encodes linear gradient with custom stops and angle", async () => {
    const { figFile, docID } = setup();
    const canvasID = figFile.addCanvas(docID, "Page");
    const buf = await addFrameAndBuild({ figFile, docID, canvasID, addContent: (fid) => {
      const lg = linearGradient().angle(135)
        .stops([{ color: BLUE, position: 0 }, { color: PURPLE, position: 1 }]).build();
      figFile.addRoundedRectangle(
        roundedRectNode(11, fid).name("R").size(80, 80).position(10, 10).fill(lg).cornerRadius(8).build(),
      );
    }});
    expect(buf.byteLength).toBeGreaterThan(0);
  }, 30_000);

  it("encodes radial gradient", async () => {
    const { figFile, docID } = setup();
    const canvasID = figFile.addCanvas(docID, "Page");
    const buf = await addFrameAndBuild({ figFile, docID, canvasID, addContent: (fid) => {
      const rg = radialGradient()
        .stops([{ color: ORANGE, position: 0 }, { color: RED, position: 1 }]).build();
      figFile.addEllipse(
        ellipseNode(11, fid).name("E").size(80, 80).position(10, 10).fill(rg).build(),
      );
    }});
    expect(buf.byteLength).toBeGreaterThan(0);
  }, 30_000);

  it("encodes angular gradient", async () => {
    const { figFile, docID } = setup();
    const canvasID = figFile.addCanvas(docID, "Page");
    const buf = await addFrameAndBuild({ figFile, docID, canvasID, addContent: (fid) => {
      const ag = angularGradient().rotation(45)
        .stops([{ color: RED, position: 0 }, { color: BLUE, position: 1 }]).build();
      figFile.addRoundedRectangle(
        roundedRectNode(11, fid).name("R").size(80, 80).position(10, 10).fill(ag).cornerRadius(8).build(),
      );
    }});
    expect(buf.byteLength).toBeGreaterThan(0);
  }, 30_000);

  it("encodes diamond gradient", async () => {
    const { figFile, docID } = setup();
    const canvasID = figFile.addCanvas(docID, "Page");
    const buf = await addFrameAndBuild({ figFile, docID, canvasID, addContent: (fid) => {
      const dg = diamondGradient().center(0.5, 0.5).size(0.4)
        .stops([{ color: WHITE, position: 0 }, { color: BLUE, position: 1 }]).build();
      figFile.addRoundedRectangle(
        roundedRectNode(11, fid).name("R").size(80, 80).position(10, 10).fill(dg).cornerRadius(8).build(),
      );
    }});
    expect(buf.byteLength).toBeGreaterThan(0);
  }, 30_000);
});

describe("Kiwi encoding: auto-layout padding", () => {
  it("encodes symbol with object padding {top, right, bottom, left}", async () => {
    const { figFile, docID } = setup();
    const canvasID = figFile.addCanvas(docID, "Page");

    const symID = 10;
    figFile.addSymbol(
      symbolNode(symID, canvasID).name("Btn").size(140, 44).position(0, 0)
        .background(BLUE).cornerRadius(8).autoLayout("HORIZONTAL").gap(8)
        .padding({ top: 10, right: 20, bottom: 10, left: 20 })
        .primaryAlign("CENTER").counterAlign("CENTER").exportAsSVG().build(),
    );
    figFile.addTextNode(
      textNode(11, symID).name("lbl").text("Btn").font("Inter", "Bold")
        .fontSize(14).color(WHITE).size(40, 20).position(0, 0).build(),
    );

    const fid = 20;
    figFile.addFrame(
      frameNode(fid, canvasID).name("F").size(200, 200).position(200, 0)
        .background(LIGHT_GRAY).clipsContent(true).exportAsSVG().build(),
    );
    figFile.addInstance(
      instanceNode(21, fid, symID).name("I").size(140, 44).position(10, 10).build(),
    );

    figFile.addInternalCanvas(docID);
    const buf = await figFile.buildAsync({ fileName: "test" });
    expect(buf.byteLength).toBeGreaterThan(0);
  }, 30_000);

  it("encodes symbol with uniform numeric padding", async () => {
    const { figFile, docID } = setup();
    const canvasID = figFile.addCanvas(docID, "Page");

    const symID = 10;
    figFile.addSymbol(
      symbolNode(symID, canvasID).name("Btn").size(140, 44).position(0, 0)
        .background(BLUE).cornerRadius(8).autoLayout("HORIZONTAL").gap(8)
        .padding(16)
        .primaryAlign("CENTER").counterAlign("CENTER").exportAsSVG().build(),
    );
    figFile.addTextNode(
      textNode(11, symID).name("lbl").text("Btn").font("Inter", "Bold")
        .fontSize(14).color(WHITE).size(40, 20).position(0, 0).build(),
    );

    const fid = 20;
    figFile.addFrame(
      frameNode(fid, canvasID).name("F").size(200, 200).position(200, 0)
        .background(LIGHT_GRAY).clipsContent(true).exportAsSVG().build(),
    );
    figFile.addInstance(
      instanceNode(21, fid, symID).name("I").size(140, 44).position(10, 10).build(),
    );

    figFile.addInternalCanvas(docID);
    const buf = await figFile.buildAsync({ fileName: "test" });
    expect(buf.byteLength).toBeGreaterThan(0);
  }, 30_000);
});
