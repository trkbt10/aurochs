import type { PdfDocument, PdfImage, PdfPage, PdfPath, PdfText } from "../domain";
import { decomposeMatrix } from "../domain";
import type { Shape, SpShape } from "../../pptx/domain/shape";
import type { Slide } from "../../pptx/domain/slide/types";
import type { Pixels } from "../../ooxml/domain/units";
import { deg } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, createFitContext } from "./transform-converter";
import {
  convertPathToGeometry,
  convertToPresetEllipse,
  convertToPresetRect,
  convertToPresetRoundRect,
  isApproximateEllipse,
  isRoundedRectangle,
  isSimpleRectangle,
} from "./path-to-geometry";
import { convertGraphicsStateToStyle } from "./color-converter";
import { convertGroupedTextToShape } from "./text-to-shapes";
import { convertImageToShape } from "./image-to-shapes";
import { computePathBBox } from "../parser/path-builder";
import type { BlockingZone, GroupingContext, TextGroupingFn } from "./text-grouping/types";
import { spatialGrouping } from "./text-grouping/spatial-grouping";

export type ConversionOptions = {
  /** ターゲットスライド幅 */
  readonly slideWidth: Pixels;
  /** ターゲットスライド高さ */
  readonly slideHeight: Pixels;
  /** フィットモード */
  readonly fit?: "contain" | "cover" | "stretch";
  /** 最小パス複雑度（これより単純なパスは無視） */
  readonly minPathComplexity?: number;
  /**
   * Function for grouping PDF text elements into PPTX TextBoxes.
   * Default: spatialGrouping (groups adjacent texts into single TextBoxes)
   */
  readonly textGroupingFn?: TextGroupingFn;
};

/**
 * PdfPageの全要素をShapeに変換
 */
export function convertPageToShapes(page: PdfPage, options: ConversionOptions): Shape[] {
  const context = createFitContext(
    page.width,
    page.height,
    options.slideWidth,
    options.slideHeight,
    options.fit ?? "contain"
  );

  const shapes: Shape[] = [];
  let shapeIdCounter = 1;

  const generateId = (): string => String(shapeIdCounter++);

  const paths: PdfPath[] = [];
  const texts: PdfText[] = [];
  const images: PdfImage[] = [];

  for (const elem of page.elements) {
    switch (elem.type) {
      case "path":
        paths.push(elem);
        break;
      case "text":
        texts.push(elem);
        break;
      case "image":
        images.push(elem);
        break;
    }
  }

  const minPathComplexity = options.minPathComplexity ?? 0;
  if (!Number.isFinite(minPathComplexity) || minPathComplexity < 0) {
    throw new Error(`Invalid minPathComplexity: ${minPathComplexity}`);
  }

  for (const path of paths) {
    if (path.operations.length < minPathComplexity) {
      continue;
    }

    const shape = convertPath(path, context, generateId());
    if (shape) {
      shapes.push(shape);
    }
  }

  // Create blocking zones from paths and images to prevent text grouping across shapes
  const blockingZones: BlockingZone[] = [];

  // Add paths as blocking zones (using bounding boxes)
  // PdfBBox is [x1, y1, x2, y2] where (x1,y1) is bottom-left and (x2,y2) is top-right
  //
  // Strategy for blocking zones:
  // - Stroke paths (lines/borders) are prioritized as visual separators
  // - Fill-only paths are treated more carefully:
  //   - Thin fill areas (likely dividers) are included
  //   - Large filled areas are likely containers (table cells, backgrounds) and excluded
  for (const path of paths) {
    if (path.paintOp === "none" || path.paintOp === "clip") {
      continue; // Skip invisible paths
    }

    const bbox = computePathBBox(path);
    const [x1, y1, x2, y2] = bbox;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    // Skip very small paths (likely rendering artifacts)
    if (width < 0.5 && height < 0.5) {
      continue;
    }

    // Determine if this path should be a blocking zone based on paint operation
    let isBlockingZone = false;

    if (path.paintOp === "stroke" || path.paintOp === "fillStroke") {
      // Stroked paths (lines, borders) are always blocking zones
      // They represent visual separators like table borders, divider lines
      isBlockingZone = true;
    } else if (path.paintOp === "fill") {
      // Fill-only paths need careful consideration:
      // - Thin fills (divider lines drawn as filled rectangles) should block
      // - Large filled areas (backgrounds, table cells) should NOT block

      // Threshold for "thin" fill: less than 3 points in either dimension
      const thinThreshold = 3;
      const isThinFill = width < thinThreshold || height < thinThreshold;

      // Aspect ratio check: very elongated shapes are likely dividers
      const aspectRatio = Math.max(width, height) / Math.max(Math.min(width, height), 0.1);
      const isElongated = aspectRatio > 20;

      // Include thin or elongated fills as blocking zones (they're visual separators)
      isBlockingZone = isThinFill || isElongated;
    }

    if (isBlockingZone) {
      blockingZones.push({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width,
        height,
      });
    }
  }

  // Add images as blocking zones (compute bounding box from CTM)
  // PDF images use unit square [0,0]-[1,1] transformed by CTM
  for (const image of images) {
    const ctm = image.graphicsState.ctm;
    const [a, b, c, d, e, f] = ctm;
    // Transform unit square corners:
    // (0,0) -> (e, f)
    // (1,0) -> (a+e, b+f)
    // (0,1) -> (c+e, d+f)
    // (1,1) -> (a+c+e, b+d+f)
    const corners = [
      { x: e, y: f },
      { x: a + e, y: b + f },
      { x: c + e, y: d + f },
      { x: a + c + e, y: b + d + f },
    ];
    const minX = Math.min(...corners.map((c) => c.x));
    const maxX = Math.max(...corners.map((c) => c.x));
    const minY = Math.min(...corners.map((c) => c.y));
    const maxY = Math.max(...corners.map((c) => c.y));
    blockingZones.push({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }

  const groupingContext: GroupingContext = {
    blockingZones: blockingZones.length > 0 ? blockingZones : undefined,
    pageWidth: page.width,
    pageHeight: page.height,
  };

  // Apply text grouping function (default: spatial grouping for better PPTX editability)
  const groupTexts = options.textGroupingFn ?? spatialGrouping;
  const groups = groupTexts(texts, groupingContext);

  // Convert each group to a single TextBox shape
  for (const group of groups) {
    const shape = convertGroupedTextToShape(group, context, generateId());
    shapes.push(shape);
  }

  for (const image of images) {
    const shape = convertImageToShape(image, context, generateId());
    shapes.push(shape);
  }

  return shapes;
}

/**
 * PdfDocument全体をSlide配列に変換
 */
export type DocumentConversionResult = {
  readonly slides: readonly Slide[];
};

export function convertDocumentToSlides(
  doc: PdfDocument,
  options: ConversionOptions
): DocumentConversionResult {
  const slides: Slide[] = doc.pages.map((page) => ({
    shapes: convertPageToShapes(page, options),
  }));

  return { slides };
}

/**
 * PdfPathをSpShapeに変換
 *
 * Transform complexity from CTM is analyzed to determine:
 * - If CTM has shear (skew), preset geometry optimizations are skipped
 * - Path coordinates are already transformed by CTM in path-builder
 */
function convertPath(path: PdfPath, context: ConversionContext, shapeId: string): SpShape | null {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  if (path.paintOp === "none" || path.paintOp === "clip") {
    return null;
  }

  if (path.operations.length === 0) {
    return null;
  }

  // Decompose CTM to detect transform complexity
  // Path coordinates are already transformed, but we check CTM complexity
  // to determine if preset geometry optimizations should be applied
  const ctmDecomposition = decomposeMatrix(path.graphicsState.ctm);

  // Skip preset geometry optimization if CTM has shear
  // When CTM has shear, the original shape is warped and preset geometries
  // (like rect, ellipse) won't represent the actual shape correctly
  const usePresetOptimization = ctmDecomposition.isSimple;

  let geometry: SpShape["properties"]["geometry"];
  if (usePresetOptimization && isSimpleRectangle(path)) {
    geometry = convertToPresetRect(path, context);
  } else if (usePresetOptimization && isApproximateEllipse(path)) {
    geometry = convertToPresetEllipse(path, context);
  } else if (usePresetOptimization && isRoundedRectangle(path)) {
    geometry = convertToPresetRoundRect(path, context);
  } else {
    geometry = convertPathToGeometry(path, context);
  }

  const { fill, line } = convertGraphicsStateToStyle(path.graphicsState, path.paintOp);

  const bbox = computePathBBox(path);
  const converted = convertBBox(bbox, context);

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `Shape ${shapeId}`,
    },
    properties: {
      transform: {
        x: converted.x,
        y: converted.y,
        width: converted.width,
        height: converted.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry,
      fill,
      line,
    },
  };
}
