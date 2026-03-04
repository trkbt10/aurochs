/** @file PdfDocument builder from parse/build context */

import {
  type PdfBBox,
  type PdfDocument,
  type PdfElement,
  type PdfImage,
  type PdfPage,
  type PdfPath,
  type PdfText,
} from "@aurochs/pdf/domain";
import { decodeText, decodeTextWithFontInfo, type FontMappings } from "@aurochs/pdf/domain/font";
import type { ParsedElement, ParsedPath, ParsedText } from "@aurochs/pdf/parser/operator/index";
import { buildPath, builtPathToPdfPath } from "@aurochs/pdf/parser/path/path-builder";
import { rasterizeSoftMaskedFillPath } from "../../../@aurochs/pdf/src/parser/soft-mask/soft-mask-raster.native";
import { applyGraphicsSoftMaskToPdfImage } from "../../../@aurochs/pdf/src/parser/soft-mask/soft-mask-apply.native";
import { rasterizeSoftMaskedText } from "../../../@aurochs/pdf/src/parser/soft-mask/soft-mask-text-raster.native";
import {
  applyGraphicsClipMaskToPdfImage,
  buildPageSpaceSoftMaskForClipMask,
} from "../../../@aurochs/pdf/src/parser/clip/clip-mask-apply.native";
import type { PdfBuildContext, PdfBuildOptions } from "@aurochs/pdf/parser/core/pdf-parser";

/** Builder stage: build final PdfDocument from a parse/build context. */
export function buildPdfDocumentFromContext(context: PdfBuildContext): PdfDocument {
  if (!context) {
    throw new Error("context is required");
  }

  const pages: PdfPage[] = context.parsedDocument.pages.map((page) => {
    const elements = convertElements({
      parsed: [...page.parsedElements],
      buildOptions: context.buildOptions,
      extractedImages: [...page.extractedImages],
      fontMappings: page.fontMappings,
    });
    return {
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      elements,
    };
  });

  return {
    pages,
    metadata: context.parsedDocument.metadata,
    embeddedFonts: context.parsedDocument.embeddedFonts,
  };
}

function bboxIntersects(a: PdfBBox, b: PdfBBox): boolean {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const aMinX = Math.min(ax1, ax2);
  const aMinY = Math.min(ay1, ay2);
  const aMaxX = Math.max(ax1, ax2);
  const aMaxY = Math.max(ay1, ay2);
  const bMinX = Math.min(bx1, bx2);
  const bMinY = Math.min(by1, by2);
  const bMaxX = Math.max(bx1, bx2);
  const bMaxY = Math.max(by1, by2);
  return aMaxX > bMinX && aMinX < bMaxX && aMaxY > bMinY && aMinY < bMaxY;
}

type ConvertElementsOptions = {
  readonly parsed: ParsedElement[];
  readonly buildOptions: Required<PdfBuildOptions>;
  readonly extractedImages: PdfImage[];
  readonly fontMappings: FontMappings;
};

function convertElements({ parsed, buildOptions, extractedImages, fontMappings }: ConvertElementsOptions): PdfElement[] {
  const elements: PdfElement[] = [];
  for (const elem of parsed) {
    switch (elem.type) {
      case "path":
        if (buildOptions.includePaths || (buildOptions.includeText && elem.source === "type3")) {
          const masked = rasterizeSoftMaskedFillPath(elem);
          if (masked) {
            const clipMasked = elem.graphicsState.clipMask ? applyGraphicsClipMaskToPdfImage(masked) : masked;
            elements.push(clipMasked);
            break;
          }

          const clipMask = elem.graphicsState.clipMask;
          if (clipMask) {
            const softMask = buildPageSpaceSoftMaskForClipMask(elem.graphicsState.ctm, clipMask);
            if (softMask) {
              const clipped = rasterizeSoftMaskedFillPath({
                ...elem,
                graphicsState: {
                  ...elem.graphicsState,
                  clipMask: undefined,
                  softMaskAlpha: 1,
                  softMask,
                },
              });
              if (clipped) {
                elements.push(clipped);
                break;
              }
            }
          }
          const pdfPath = convertPath(elem, buildOptions.minPathComplexity);
          if (pdfPath) {
            elements.push(pdfPath);
          }
        }
        break;
      case "text":
        if (buildOptions.includeText) {
          const masked = rasterizeSoftMaskedText(elem, fontMappings);
          if (masked) {
            const clipMasked = elem.graphicsState.clipMask ? applyGraphicsClipMaskToPdfImage(masked) : masked;
            elements.push(clipMasked);
            break;
          }

          const clipMask = elem.graphicsState.clipMask;
          if (clipMask) {
            const softMask = buildPageSpaceSoftMaskForClipMask(elem.graphicsState.ctm, clipMask);
            if (softMask) {
              const clipped = rasterizeSoftMaskedText(
                {
                  ...elem,
                  graphicsState: {
                    ...elem.graphicsState,
                    clipMask: undefined,
                    softMaskAlpha: 1,
                    softMask,
                  },
                },
                fontMappings,
              );
              if (clipped) {
                elements.push(clipped);
                break;
              }
            }
          }
          const pdfTexts = convertText(elem, fontMappings);
          elements.push(...pdfTexts);
        }
        break;
      case "image":
        break;
      case "rasterImage":
        elements.push(elem.image);
        break;
    }
  }
  elements.push(...extractedImages.map(applyGraphicsSoftMaskToPdfImage));
  return elements;
}

function convertPath(parsed: ParsedPath, minComplexity: number): PdfPath | null {
  if (parsed.paintOp === "none" || parsed.paintOp === "clip") {
    return null;
  }
  const built = buildPath(parsed);
  if (built.operations.length < minComplexity) {
    return null;
  }
  const clipBBox = parsed.graphicsState.clipBBox;
  if (clipBBox && !bboxIntersects(built.bounds, clipBBox)) {
    return null;
  }
  return builtPathToPdfPath(built);
}

function getFontInfo(fontName: string, fontMappings: FontMappings) {
  const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;
  const state = { fontInfo: fontMappings.get(cleanName) };
  if (!state.fontInfo) {
    const plusIndex = cleanName.indexOf("+");
    if (plusIndex > 0) {
      state.fontInfo = fontMappings.get(cleanName.slice(plusIndex + 1));
    }
  }
  if (!state.fontInfo) {
    for (const [key, value] of fontMappings.entries()) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        state.fontInfo = value;
        break;
      }
    }
  }
  return state.fontInfo;
}

function textRunBounds(args: {
  readonly run: { readonly x: number; readonly y: number; readonly endX: number; readonly endY: number };
  readonly ascender: number;
  readonly descender: number;
  readonly effectiveSize: number;
}): PdfBBox {
  const { run, ascender, descender, effectiveSize } = args;
  const textHeight = ((ascender - descender) * effectiveSize) / 1000;
  const dx = run.endX - run.x;
  const dy = run.endY - run.y;
  const baselineLength = Math.hypot(dx, dy);
  const ux = baselineLength > 1e-6 ? dx / baselineLength : 1;
  const uy = baselineLength > 1e-6 ? dy / baselineLength : 0;
  const nx = -uy;
  const ny = ux;
  const descOffset = (descender * effectiveSize) / 1000;
  const ascOffset = descOffset + textHeight;

  const corners = [
    { x: run.x + nx * descOffset, y: run.y + ny * descOffset },
    { x: run.endX + nx * descOffset, y: run.endY + ny * descOffset },
    { x: run.x + nx * ascOffset, y: run.y + ny * ascOffset },
    { x: run.endX + nx * ascOffset, y: run.endY + ny * ascOffset },
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxX = Math.max(...corners.map((point) => point.x));
  const maxY = Math.max(...corners.map((point) => point.y));
  return [minX, minY, maxX, maxY];
}

function convertText(parsed: ParsedText, fontMappings: FontMappings): PdfText[] {
  const mode = parsed.graphicsState.textRenderingMode;
  if (mode === 3 || mode === 7) {
    return [];
  }

  const results: PdfText[] = [];
  const clipBBox = parsed.graphicsState.clipBBox;

  for (const run of parsed.runs) {
    // Prefer decoding/metrics by font resource name first to avoid mixing encodings.
    const primaryFontKey = run.fontName;
    const fallbackFontKey = run.baseFont;

    function decodeRunText(args: {
      readonly run: typeof run;
      readonly primaryFontKey: string;
      readonly fallbackFontKey: string | undefined;
      readonly fontMappings: FontMappings;
    }): string {
      const { run, primaryFontKey, fallbackFontKey, fontMappings } = args;
      if (run.fontInfo) {
        return decodeTextWithFontInfo(run.text, run.fontInfo);
      }
      const primary = decodeText(run.text, primaryFontKey, fontMappings);
      if (primary !== run.text || !fallbackFontKey || fallbackFontKey === primaryFontKey) {
        return primary;
      }
      return decodeText(run.text, fallbackFontKey, fontMappings);
    }

    const fontInfo =
      run.fontInfo ??
      getFontInfo(primaryFontKey, fontMappings) ??
      (fallbackFontKey ? getFontInfo(fallbackFontKey, fontMappings) : undefined);

    const decodedText = decodeRunText({ run, primaryFontKey, fallbackFontKey, fontMappings });

    const metrics = fontInfo?.metrics;
    const ascender = metrics?.ascender ?? 800;
    const descender = metrics?.descender ?? -200;

    const effectiveSize = run.effectiveFontSize;
    const [minX, minY, maxX, maxY] = textRunBounds({
      run,
      ascender,
      descender,
      effectiveSize,
    });
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    if (clipBBox) {
      const bbox: PdfBBox = [minX, minY, maxX, maxY];
      if (!bboxIntersects(bbox, clipBBox)) {
        continue;
      }
    }

    const actualFontName = run.baseFont ?? fontInfo?.baseFont ?? run.fontName;

    results.push({
      type: "text" as const,
      text: decodedText,
      x: minX,
      y: minY,
      width,
      height,
      fontName: actualFontName,
      baseFont: run.baseFont ?? fontInfo?.baseFont,
      fontSize: effectiveSize,
      graphicsState: parsed.graphicsState,
      charSpacing: run.charSpacing,
      wordSpacing: run.wordSpacing,
      horizontalScaling: run.horizontalScaling,
      fontMetrics: { ascender, descender },
      isBold: fontInfo?.isBold,
      isItalic: fontInfo?.isItalic,
      cidOrdering: fontInfo?.ordering,
    });
  }

  return results;
}
