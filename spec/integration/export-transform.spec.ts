/**
 * @file Transform export round-trip integration test
 *
 * Verifies that patching a slide's transform and exporting to PPTX preserves
 * the position after reloading.
 *
 * @see docs/plans/pptx-export-implementation-guide.md (Phase 3)
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { openPresentation } from "@aurochs-office/pptx";
import { convertToPresentationDocument, loadPptxFromBuffer } from "@aurochs-office/pptx/app";
import { exportPptxAsBuffer } from "@aurochs-builder/pptx/export";
import { detectSlideChanges, patchSlideXml } from "@aurochs-builder/pptx/patcher";
import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Slide as DomainSlide } from "@aurochs-office/pptx/domain/slide/types";
import type { Shape } from "@aurochs-office/pptx/domain/shape";
import type { Transform } from "@aurochs-office/pptx/domain/geometry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "../../fixtures");

function findShapeById(shapes: readonly Shape[], id: string): Shape | undefined {
  for (const shape of shapes) {
    if ("nonVisual" in shape && shape.nonVisual.id === id) {
      return shape;
    }
    if (shape.type === "grpSp") {
      const found = findShapeById(shape.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function getShapeTransform(shape: Shape): Transform | undefined {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return shape.properties.transform;
    case "graphicFrame":
      return shape.transform;
    case "grpSp":
      return undefined;
    case "contentPart":
      return undefined;
  }
}

function setShapeTransform(shape: Shape, transform: Transform): Shape {
  switch (shape.type) {
    case "sp":
    case "pic":
    case "cxnSp":
      return { ...shape, properties: { ...shape.properties, transform } };
    case "graphicFrame":
      return { ...shape, transform };
    case "grpSp":
      return shape;
    case "contentPart":
      return shape;
  }
}

function updateFirstTransformableShape(
  slide: DomainSlide,
  next: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }>,
): { slide: DomainSlide; shapeId: string } {
  const shapeIndex = slide.shapes.findIndex((shape) => {
    if (!("nonVisual" in shape)) {
      return false;
    }
    return getShapeTransform(shape) !== undefined;
  });

  const shape = slide.shapes[shapeIndex];
  if (shapeIndex === -1 || !shape) {
    throw new Error("No transformable shape found in slide");
  }

  if (!("nonVisual" in shape)) {
    throw new Error("Expected shape to have nonVisual");
  }
  const current = getShapeTransform(shape);
  if (!current) {
    throw new Error("Expected shape to have transform");
  }

  const updatedShape = setShapeTransform(shape, {
    ...current,
    x: px(next.x),
    y: px(next.y),
    width: px(next.width),
    height: px(next.height),
    rotation: deg(next.rotation),
  });

  const shapes = slide.shapes.map((s, index) => (index === shapeIndex ? updatedShape : s));
  return { slide: { ...slide, shapes }, shapeId: shape.nonVisual.id };
}

describe("Transform export round-trip", () => {
  it("preserves shape position after patch + export", async () => {
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
    const { slide: modifiedDomainSlide, shapeId } = updateFirstTransformableShape(originalDomainSlide, {
      x: 120,
      y: 80,
      width: 400,
      height: 200,
      rotation: 45,
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

    const reloadedTransform = getShapeTransform(reloadedShape);
    if (!reloadedTransform) {
      throw new Error(`Expected shape ${shapeId} to have a transform after reload`);
    }

    expect(reloadedTransform.x).toBe(px(120));
    expect(reloadedTransform.y).toBe(px(80));
    expect(reloadedTransform.width).toBe(px(400));
    expect(reloadedTransform.height).toBe(px(200));
    expect(reloadedTransform.rotation).toBe(deg(45));
  });
});
