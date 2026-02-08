/**
 * @file Fill/Line/Effects export round-trip integration test
 *
 * Verifies that patching a slide's Fill/Line/Effects and exporting to PPTX preserves
 * the changes after reloading.
 *
 * @see docs/plans/pptx-export-implementation-guide.md (Phase 4)
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { openPresentation } from "@aurochs-office/pptx";
import { convertToPresentationDocument, loadPptxFromBuffer } from "@aurochs-office/pptx/app";
import { exportPptxAsBuffer } from "@aurochs-builder/pptx/export";
import { detectSlideChanges, patchSlideXml } from "@aurochs-builder/pptx/patcher";
import { deg, pct, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Slide as DomainSlide } from "@aurochs-office/pptx/domain/slide/types";
import type { Effects, Fill, Line } from "@aurochs-office/pptx/domain";
import type { Shape, SpShape } from "@aurochs-office/pptx/domain/shape";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "../../fixtures");

function findShapeById(shapes: readonly Shape[], id: string): Shape | undefined {
  for (const shape of shapes) {
    switch (shape.type) {
      case "sp":
      case "pic":
      case "cxnSp":
      case "grpSp":
      case "graphicFrame":
        if (shape.nonVisual.id === id) {
          return shape;
        }
        if (shape.type === "grpSp") {
          const found = findShapeById(shape.children, id);
          if (found) {
            return found;
          }
        }
        break;
      case "contentPart":
        break;
    }
  }
  return undefined;
}

function updateFirstSpShape(
  slide: DomainSlide,
  next: Readonly<{
    fill: Fill;
    line: Line;
    effects: Effects;
  }>,
): { slide: DomainSlide; shapeId: string } {
  const shapeIndex = slide.shapes.findIndex((shape) => shape.type === "sp");
  const shape = slide.shapes[shapeIndex];

  if (shapeIndex === -1 || !shape || shape.type !== "sp") {
    throw new Error("No p:sp shape found in slide");
  }

  const updatedShape: SpShape = {
    ...shape,
    properties: {
      ...shape.properties,
      fill: next.fill,
      line: next.line,
      effects: next.effects,
    },
  };

  const shapes = slide.shapes.map((s, index) => (index === shapeIndex ? updatedShape : s));
  return { slide: { ...slide, shapes }, shapeId: shape.nonVisual.id };
}

describe("Fill/Line/Effects export round-trip", () => {
  it("preserves fill/line/effects after patch + export", async () => {
    const fixturePath = path.join(FIXTURE_DIR, "decompressed-pptx/Sample_demo1.pptx");
    const { presentationFile } = await loadPptxFile(fixturePath);

    const presentation = openPresentation(presentationFile);
    const doc = convertToPresentationDocument({ presentation, presentationFile });

    const originalSlideWithId = doc.slides[0];
    if (!originalSlideWithId) {
      throw new Error("Expected at least one slide");
    }
    if (!originalSlideWithId.apiSlide) {
      throw new Error("Expected apiSlide to be present");
    }

    const originalDomainSlide = originalSlideWithId.slide;

    const fill: Fill = {
      type: "gradientFill",
      rotWithShape: true,
      stops: [
        { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
        { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
      ],
      linear: { angle: deg(45), scaled: true },
    };

    const line: Line = {
      width: px(3),
      cap: "round",
      compound: "sng",
      alignment: "ctr",
      fill: { type: "solidFill", color: { spec: { type: "srgb", value: "00FF00" } } },
      dash: "dash",
      join: "bevel",
    };

    const effects: Effects = {
      shadow: {
        type: "outer",
        color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
        blurRadius: px(4),
        distance: px(2),
        direction: deg(135),
      },
      glow: {
        color: { spec: { type: "srgb", value: "FF00FF" } },
        radius: px(2),
      },
      fillOverlay: {
        blend: "darken",
        fillType: "solidFill",
        fill: { type: "solidFill", color: { spec: { type: "srgb", value: "112233" } } },
      },
    };

    const { slide: modifiedDomainSlide, shapeId } = updateFirstSpShape(originalDomainSlide, {
      fill,
      line,
      effects,
    });

    const changes = detectSlideChanges(originalDomainSlide, modifiedDomainSlide);
    const patchedXml = patchSlideXml(originalSlideWithId.apiSlide.content, changes);
    const patchedApiSlide = { ...originalSlideWithId.apiSlide, content: patchedXml };

    const patchedDoc = {
      ...doc,
      slides: [
        { ...originalSlideWithId, slide: modifiedDomainSlide, apiSlide: patchedApiSlide },
        ...doc.slides.slice(1),
      ],
    };

    const exported = await exportPptxAsBuffer(patchedDoc);

    const reloaded = await loadPptxFromBuffer(exported);
    const reloadedDoc = convertToPresentationDocument(reloaded);

    const reloadedSlide = reloadedDoc.slides[0]?.slide;
    if (!reloadedSlide) {
      throw new Error("Expected at least one slide after reload");
    }

    const reloadedShape = findShapeById(reloadedSlide.shapes, shapeId);
    if (!reloadedShape) {
      throw new Error(`Expected shape ${shapeId} to exist after reload`);
    }

    if (reloadedShape.type !== "sp") {
      throw new Error(`Expected shape ${shapeId} to be a p:sp after reload, got: ${reloadedShape.type}`);
    }

    expect(reloadedShape.properties.fill).toEqual(fill);
    expect(reloadedShape.properties.line).toEqual(line);
    expect(reloadedShape.properties.effects).toBeDefined();
    expect(reloadedShape.properties.effects).toMatchObject({
      shadow: {
        type: "outer",
        blurRadius: px(4),
        distance: px(2),
        direction: deg(135),
        rotateWithShape: true,
        color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
      },
      glow: {
        radius: px(2),
        color: { spec: { type: "srgb", value: "FF00FF" } },
      },
      fillOverlay: {
        blend: "darken",
        fillType: "solidFill",
        fill: { type: "solidFill", color: { spec: { type: "srgb", value: "112233" } } },
      },
    } satisfies Effects);
  });
});
