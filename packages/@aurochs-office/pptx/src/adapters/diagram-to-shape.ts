/** @file Converts diagram layout results to PPTX shape format */
import type { LayoutShapeResult } from "@aurochs-office/diagram/domain/layout-shape-result";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { BaseLine } from "@aurochs-office/drawing-ml/domain/line";
import { deg, px } from "@aurochs-office/drawing-ml/domain/units";
import type { PresetGeometry } from "@aurochs-office/drawing-ml/domain/geometry";
import type { SpShape } from "../domain/shape";
import type { TextBody } from "../domain/text";
import { isTextBody } from "../domain/diagram/format-guards";

/**
 * Convert a BaseFill (from diagram) to PPTX-compatible fill.
 * Note: BlipFill from diagrams is not supported (diagrams don't typically use blip fills).
 */
function toFill(fill: BaseFill | undefined): BaseFill | undefined {
  if (!fill) {
    return undefined;
  }
  // Diagrams don't produce blipFill; skip if encountered
  if (fill.type === "blipFill") {
    return undefined;
  }
  return fill;
}

/**
 * Convert a BaseLine (from diagram) to PPTX-compatible line.
 * Note: BlipFill in line.fill from diagrams is not supported.
 */
function toLine(line: BaseLine | undefined): BaseLine | undefined {
  if (!line) {
    return undefined;
  }
  // Skip if line fill is blip (diagrams don't typically use blip fills)
  if (line.fill.type === "blipFill") {
    return undefined;
  }
  return line;
}

function applyStyleFillToTextBody(textBody: TextBody, textFill: BaseFill): TextBody {
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

/**
 * Ensure textBody has bodyProperties (required by PPTX TextBody type).
 * Diagram layout engine produces format-agnostic textBody without bodyProperties.
 */
function ensureBodyProperties(textBody: TextBody): TextBody {
  if (textBody.bodyProperties) {
    return textBody;
  }
  return { ...textBody, bodyProperties: {} };
}

function toTextBody(result: LayoutShapeResult): TextBody | undefined {
  if (!isTextBody(result.textBody)) {
    // Diagram textBody may lack bodyProperties — try to adapt
    if (isPartialTextBody(result.textBody)) {
      const adapted = ensureBodyProperties(result.textBody as TextBody);
      if (!result.textFill) {
        return adapted;
      }
      const textFill = toFill(result.textFill);
      return textFill ? applyStyleFillToTextBody(adapted, textFill) : adapted;
    }
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

/**
 * Check if value looks like a textBody without bodyProperties.
 * This handles diagram-generated textBody that has paragraphs but no bodyProperties.
 */
function isPartialTextBody(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return "paragraphs" in v && Array.isArray(v.paragraphs);
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
