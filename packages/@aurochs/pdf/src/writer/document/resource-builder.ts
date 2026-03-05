/**
 * @file PDF Resource Dictionary Builder
 *
 * Builds the /Resources dictionary for PDF pages.
 */

import type { PdfObject } from "../../native/core/types";
import { serializePdfDict } from "../object-serializer";

/**
 * References to resources used in a page.
 */
export type ResourceRefs = {
  /** Font name -> object number */
  readonly fonts: ReadonlyMap<string, number>;
  /** Image name -> object number */
  readonly images: ReadonlyMap<string, number>;
  /** ExtGState name -> object number (for transparency, etc.) */
  readonly extGStates?: ReadonlyMap<string, number>;
};

/**
 * Build a /Resources dictionary as serialized bytes.
 *
 * @param refs - References to font, image, and graphics state objects
 * @returns Serialized dictionary bytes
 */
export function buildResourceDict(refs: ResourceRefs): Uint8Array {
  const resourceDict = new Map<string, PdfObject>();

  // /Font subdictionary
  if (refs.fonts.size > 0) {
    const fontDict = new Map<string, PdfObject>();
    for (const [name, objNum] of refs.fonts) {
      fontDict.set(name, { type: "ref", obj: objNum, gen: 0 });
    }
    resourceDict.set("Font", { type: "dict", map: fontDict });
  }

  // /XObject subdictionary (for images)
  if (refs.images.size > 0) {
    const xobjectDict = new Map<string, PdfObject>();
    for (const [name, objNum] of refs.images) {
      xobjectDict.set(name, { type: "ref", obj: objNum, gen: 0 });
    }
    resourceDict.set("XObject", { type: "dict", map: xobjectDict });
  }

  // /ExtGState subdictionary (for transparency)
  if (refs.extGStates && refs.extGStates.size > 0) {
    const gsDict = new Map<string, PdfObject>();
    for (const [name, objNum] of refs.extGStates) {
      gsDict.set(name, { type: "ref", obj: objNum, gen: 0 });
    }
    resourceDict.set("ExtGState", { type: "dict", map: gsDict });
  }

  // /ProcSet (required in older PDF versions, optional in 1.4+)
  resourceDict.set("ProcSet", {
    type: "array",
    items: [
      { type: "name", value: "PDF" },
      { type: "name", value: "Text" },
      { type: "name", value: "ImageB" },
      { type: "name", value: "ImageC" },
      { type: "name", value: "ImageI" },
    ],
  });

  return serializePdfDict(resourceDict);
}

/**
 * Build an empty resource dictionary (minimal valid resources).
 */
export function buildEmptyResourceDict(): Uint8Array {
  return buildResourceDict({
    fonts: new Map(),
    images: new Map(),
  });
}
