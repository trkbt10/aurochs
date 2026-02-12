/** @file Converts diagram layout results to PPTX shape format */
import type { LayoutShapeResult } from "@aurochs-office/diagram/domain/layout-shape-result";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import type { Fill, Line } from "../domain/color/types";
import type { SpShape, PresetGeometry } from "../domain/shape";
import type { TextBody } from "../domain/text";
import { isTextBody } from "../domain/diagram/format-guards";

/**
 * Convert a BaseFill (from diagram) to PPTX Fill.
 * Note: BlipFill from diagrams is not supported (diagrams don't typically use blip fills).
 */
function toFill(fill: BaseFill | undefined): Fill | undefined {
  if (!fill) {
    return undefined;
  }
  // Diagrams don't produce blipFill; skip if encountered
  if (fill.type === "blip") {
    return undefined;
  }
  return fill as Fill;
}

/**
 * Convert a BaseLine (from diagram) to PPTX Line.
 * Note: BlipFill in line.fill from diagrams is not supported.
 */
function toLine(line: BaseLine | undefined): Line | undefined {
  if (!line) {
    return undefined;
  }
  // Skip if line fill is blip (diagrams don't typically use blip fills)
  if (line.fill.type === "blip") {
    return undefined;
  }
  return line as Line;
}

function applyStyleFillToTextBody(textBody: TextBody, textFill: Fill): TextBody {
  const updatedParagraphs = textBody.paragraphs.map((paragraph) => {
    if (!paragraph.runs) {
      return paragraph;
    }

    const updatedRuns = paragraph.runs.map((run) => {
      if (run.type === "text" && !run.properties?.fill) {
        return {
          ...run,
          properties: {
            ...run.properties,
            fill: textFill,
          },
        };
      }
      return run;
    });

    return {
      ...paragraph,
      runs: updatedRuns,
    };
  });

  return {
    ...textBody,
    paragraphs: updatedParagraphs,
  };
}

function toPresetGeometry(geometry: LayoutShapeResult["geometry"]): PresetGeometry | undefined {
  if (geometry === undefined) {
    return undefined;
  }
  return {
    type: "preset",
    preset: geometry.preset,
    adjustValues: geometry.adjustValues,
  };
}

function toTextBody(result: LayoutShapeResult): TextBody | undefined {
  if (!isTextBody(result.textBody)) {
    return undefined;
  }
  if (!result.textFill) {
    return result.textBody;
  }
  const textFill = toFill(result.textFill);
  if (!textFill) {
    return result.textBody;
  }
  return applyStyleFillToTextBody(result.textBody, textFill);
}

/** Convert a diagram layout result to a PPTX SpShape */
export function convertLayoutResultToSpShape(result: LayoutShapeResult): SpShape {
  const geometry = toPresetGeometry(result.geometry);

  return {
    type: "sp",
    nonVisual: {
      id: result.id,
      name: result.name,
    },
    properties: {
      transform: {
        x: px(result.transform.x),
        y: px(result.transform.y),
        width: px(result.transform.width),
        height: px(result.transform.height),
        rotation: deg(result.transform.rotation ?? 0),
        flipH: result.transform.flipHorizontal ?? false,
        flipV: result.transform.flipVertical ?? false,
      },
      geometry,
      fill: toFill(result.fill),
      line: toLine(result.line),
      effects: result.effects,
    },
    textBody: toTextBody(result),
    modelId: result.modelId,
  };
}
