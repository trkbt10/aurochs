/**
 * @file Geometry path decoding for Figma nodes
 */

import { decodeBlobToSvgPath, type FigBlob } from "@oxen/fig/parser";
import type { FigFillGeometry } from "@oxen/fig/types";

export type { FigFillGeometry };

type WindingRule = "NONZERO" | "EVENODD" | "ODD";

export type GeometryPathData = {
  readonly data: string;
  readonly windingRule?: WindingRule;
};

// =============================================================================
// Geometry Decoding
// =============================================================================

function getGeometryWindingRule(geom: FigFillGeometry): WindingRule | undefined {
  const rule = geom.windingRule;
  if (!rule) {
    return undefined;
  }
  if (typeof rule === "string") {
    return rule as WindingRule;
  }
  return rule.name as WindingRule;
}

export function decodePathsFromGeometry(
  fillGeometry: readonly FigFillGeometry[],
  blobs: readonly FigBlob[]
): GeometryPathData[] {
  const paths: GeometryPathData[] = [];

  for (const geom of fillGeometry) {
    if (geom.commandsBlob !== undefined && geom.commandsBlob < blobs.length) {
      const blob = blobs[geom.commandsBlob];
      if (blob) {
        const data = decodeBlobToSvgPath(blob);
        if (data) {
          paths.push({
            data,
            windingRule: getGeometryWindingRule(geom),
          });
        }
      }
    }
  }

  return paths;
}

export function mapWindingRule(
  rule: WindingRule | undefined
): "nonzero" | "evenodd" | undefined {
  switch (rule) {
    case "NONZERO":
      return "nonzero";
    case "EVENODD":
    case "ODD":
      return "evenodd";
    default:
      return undefined;
  }
}
