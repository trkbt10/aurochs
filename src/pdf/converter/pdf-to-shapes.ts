import type { PdfDocument, PdfImage, PdfPage, PdfPath, PdfText } from "../domain";
import { decomposeMatrix } from "../domain";
import type { Shape, SpShape } from "../../pptx/domain/shape";
import type { Slide } from "../../pptx/domain/slide/types";
import type { Pixels } from "../../ooxml/domain/units";
import { deg } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, createFitContext } from "./transform-converter";
import { convertPathToGeometry, convertToPresetRect, isSimpleRectangle } from "./path-to-geometry";
import { convertGraphicsStateToStyle } from "./color-converter";
import { convertTextToShape } from "./text-to-shapes";
import { convertImageToShape } from "./image-to-shapes";
import { computePathBBox } from "../parser/path-builder";

export type ConversionOptions = {
  /** ターゲットスライド幅 */
  readonly slideWidth: Pixels;
  /** ターゲットスライド高さ */
  readonly slideHeight: Pixels;
  /** フィットモード */
  readonly fit?: "contain" | "cover" | "stretch";
  /** 最小パス複雑度（これより単純なパスは無視） */
  readonly minPathComplexity?: number;
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

  for (const text of texts) {
    const shape = convertTextToShape(text, context, generateId());
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

  const geometry =
    usePresetOptimization && isSimpleRectangle(path)
      ? convertToPresetRect(path, context)
      : convertPathToGeometry(path, context);

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
