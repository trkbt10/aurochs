/**
 * @file Geometry path decoding for Figma nodes
 *
 * Winding rule mapping delegates to geometry/interpret.ts (the SoT).
 */

import { decodeBlobToSvgPath, type FigBlob } from "@aurochs/fig/parser";
import type { FigFillGeometry } from "@aurochs/fig/types";
import { mapWindingRule as sharedMapWindingRule, type WindingRule } from "../geometry";

export type GeometryPathData = {
  readonly data: string;
  readonly windingRule?: WindingRule;
};

// =============================================================================
// Geometry Decoding
// =============================================================================

function getGeometryWindingRule(geom: FigFillGeometry): WindingRule {
  return sharedMapWindingRule(geom.windingRule);
}






/** Decode path data from Figma geometry blobs */
export function decodePathsFromGeometry(
  fillGeometry: readonly FigFillGeometry[],
  blobs: readonly FigBlob[],
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






/** Re-export shared winding rule mapper for consumers that import from this module */
export { mapWindingRule } from "../geometry";
