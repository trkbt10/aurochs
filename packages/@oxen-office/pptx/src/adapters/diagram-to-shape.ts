import type { LayoutShapeResult } from "@oxen-office/diagram/domain/layout-shape-result";
import { deg, px } from "@oxen-office/ooxml/domain/units";
import type { Fill } from "../domain/color/types";
import type { SpShape, PresetGeometry } from "../domain/shape";
import type { TextBody } from "../domain/text";
import { isTextBody } from "../domain/diagram/format-guards";

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
  return applyStyleFillToTextBody(result.textBody, result.textFill);
}

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
      fill: result.fill,
      line: result.line,
      effects: result.effects,
    },
    textBody: toTextBody(result),
    modelId: result.modelId,
  };
}
