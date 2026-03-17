/**
 * @file PDF Page Builder
 *
 * Builds PDF page objects from PdfPage domain type.
 */

import type { PdfObject } from "../../native/core/types";
import type { PdfPage, PdfElement, PdfEmbeddedFont } from "../../domain/document";
import type { PdfPath } from "../../domain/path";
import type { PdfText } from "../../domain/text";
import type { PdfImage } from "../../domain/image";
import { serializePdfDict, serializeIndirectObject } from "../object-serializer";
import { serializeContentStream } from "../stream-encoder";
import {
  serializePath,
  serializeText,
  serializeGraphicsState,
  wrapInGraphicsState,
} from "../content-stream";
import { buildResourceDict, type ResourceRefs } from "./resource-builder";
import type { PdfObjectTracker } from "./object-tracker";

/**
 * Result of building a page.
 */
export type PageBuildResult = {
  /** Page dictionary object number */
  readonly pageObjNum: number;
  /** Content stream object number */
  readonly contentObjNum: number;
  /** Resource references used */
  readonly resourceRefs: ResourceRefs;
  /** Font names used in this page */
  readonly usedFontNames: ReadonlySet<string>;
  /** Images used in this page */
  readonly images: readonly PdfImage[];
};

/**
 * Collect all font names used in text elements.
 */
function collectFontNames(elements: readonly PdfElement[]): Set<string> {
  const fontNames = new Set<string>();

  for (const element of elements) {
    if (element.type === "text") {
      fontNames.add(element.fontName);
      if (element.baseFont) {
        fontNames.add(element.baseFont);
      }
    }
  }

  return fontNames;
}

/**
 * Collect all images from elements.
 */
function collectImages(elements: readonly PdfElement[]): PdfImage[] {
  return elements.filter((e): e is PdfImage => e.type === "image");
}

/**
 * Generate content stream operators for a page's elements.
 */
// eslint-disable-next-line custom/max-params -- legacy API with separate font/image maps
function generateContentStreamOperators(
  elements: readonly PdfElement[],
  fontMap: ReadonlyMap<string, string>,
  imageMap: ReadonlyMap<number, string>,
  embeddedFonts?: readonly PdfEmbeddedFont[]
): string {
  const operators: string[] = [];
  // eslint-disable-next-line no-restricted-syntax -- counter incremented in loop
  let imageIndex = 0;

  for (const element of elements) {
    switch (element.type) {
      case "path": {
        const path = element as PdfPath;
        // Wrap in q/Q to isolate graphics state
        const pathOps = [
          serializeGraphicsState(path.graphicsState, {
            includeColors: true,
            includeLineStyle: true,
            includeTransform: false,
          }),
          serializePath(path),
        ].join("\n");
        operators.push(wrapInGraphicsState(pathOps));
        break;
      }

      case "text": {
        const text = element as PdfText;
        // Build text serialization context
        const ctx = {
          fontNameToResource: fontMap,
          embeddedFonts,
        };
        const textOps = [
          serializeGraphicsState(text.graphicsState, {
            includeColors: true,
            includeLineStyle: false,
            includeTransform: false,
          }),
          serializeText(text, ctx),
        ].join("\n");
        operators.push(wrapInGraphicsState(textOps));
        break;
      }

      case "image": {
        const image = element as PdfImage;
        const imageName = imageMap.get(imageIndex);
        if (imageName) {
          // Image placement using CTM
          const [a, b, c, d, e, f] = image.graphicsState.ctm;
          const imageOps = [
            `${a} ${b} ${c} ${d} ${e} ${f} cm`,
            `/${imageName} Do`,
          ].join("\n");
          operators.push(wrapInGraphicsState(imageOps));
        }
        imageIndex++;
        break;
      }
    }
  }

  return operators.join("\n");
}

export type BuildPageOptions = {
  readonly page: PdfPage;
  readonly pagesObjNum: number;
  readonly fontObjMap: ReadonlyMap<string, number>;
  readonly imageObjMap: ReadonlyMap<number, number>;
  readonly tracker: PdfObjectTracker;
  /** Embedded fonts for CID font text serialization. */
  readonly embeddedFonts?: readonly PdfEmbeddedFont[];
};

/**
 * Build a page object.
 */
export function buildPage(options: BuildPageOptions): PageBuildResult {
  const { page, pagesObjNum, fontObjMap, imageObjMap, tracker, embeddedFonts } = options;
  // Allocate object numbers
  const pageObjNum = tracker.allocate();
  const contentObjNum = tracker.allocate();
  const resourcesObjNum = tracker.allocate();

  // Collect used resources
  const usedFontNames = collectFontNames(page.elements);
  const images = collectImages(page.elements);

  // Build font resource map (name -> resource name)
  const fontResourceMap = new Map<string, string>();
  // eslint-disable-next-line no-restricted-syntax -- counter incremented in loop
  let fontIndex = 1;
  for (const fontName of usedFontNames) {
    if (fontObjMap.has(fontName)) {
      fontResourceMap.set(fontName, `F${fontIndex}`);
      fontIndex++;
    }
  }

  // Build image resource map (index -> resource name)
  const imageResourceMap = new Map<number, string>();
  // eslint-disable-next-line no-restricted-syntax -- counter incremented in loop
  let imageIdx = 0;
  for (const _ of images) {
    if (imageObjMap.has(imageIdx)) {
      imageResourceMap.set(imageIdx, `Im${imageIdx + 1}`);
    }
    imageIdx++;
  }

  // Generate content stream
  const contentOperators = generateContentStreamOperators(
    page.elements,
    fontResourceMap,
    imageResourceMap,
    embeddedFonts
  );
  const contentStream = serializeContentStream(contentOperators, "FlateDecode");
  tracker.set(contentObjNum, serializeIndirectObject(contentObjNum, 0, contentStream));

  // Build resources dictionary
  const fontRefs = new Map<string, number>();
  fontIndex = 1;
  for (const fontName of usedFontNames) {
    const objNum = fontObjMap.get(fontName);
    if (objNum !== undefined) {
      fontRefs.set(`F${fontIndex}`, objNum);
      fontIndex++;
    }
  }

  const imageRefs = new Map<string, number>();
  imageIdx = 0;
  for (const _ of images) {
    const objNum = imageObjMap.get(imageIdx);
    if (objNum !== undefined) {
      imageRefs.set(`Im${imageIdx + 1}`, objNum);
    }
    imageIdx++;
  }

  const resourceRefs: ResourceRefs = {
    fonts: fontRefs,
    images: imageRefs,
  };
  const resourcesBytes = buildResourceDict(resourceRefs);
  tracker.set(resourcesObjNum, serializeIndirectObject(resourcesObjNum, 0, resourcesBytes));

  // Build page dictionary
  const pageDict = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "Page" }],
    ["Parent", { type: "ref", obj: pagesObjNum, gen: 0 }],
    ["MediaBox", {
      type: "array",
      items: [
        { type: "number", value: 0 },
        { type: "number", value: 0 },
        { type: "number", value: page.width },
        { type: "number", value: page.height },
      ],
    }],
    ["Contents", { type: "ref", obj: contentObjNum, gen: 0 }],
    ["Resources", { type: "ref", obj: resourcesObjNum, gen: 0 }],
  ]);

  const pageDictBytes = serializePdfDict(pageDict);
  tracker.set(pageObjNum, serializeIndirectObject(pageObjNum, 0, pageDictBytes));

  return {
    pageObjNum,
    contentObjNum,
    resourceRefs,
    usedFontNames,
    images,
  };
}
