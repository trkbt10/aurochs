/**
 * @file src/pdf/importer/slide-builder.ts
 */

import type { PdfPage } from "@oxen/pdf/domain";
import type { Fill } from "@oxen-office/pptx/domain/color/types";
import type { Slide, Background } from "@oxen-office/pptx/domain/slide/types";
import type { SpShape } from "@oxen-office/pptx/domain/shape";
import type { SlideId, SlideWithId } from "@oxen-office/pptx/app/presentation-document";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import { deg, pt, px } from "@oxen-office/ooxml/domain/units";
import { rgbToHex } from "@oxen/color";
import { convertPageToShapes, type ConversionOptions } from "../converter/pdf-to-shapes";
import { PT_TO_PX } from "@oxen/pdf/domain";

export type SlideBuilderOptions = ConversionOptions & {
  /** 背景色を設定するか */
  readonly setBackground?: boolean;
  /** 背景色（デフォルト: 白） */
  readonly backgroundColor?: { readonly r: number; readonly g: number; readonly b: number };
};

/**
 * PdfPageからSlideを構築
 */
export function buildSlideFromPage(page: PdfPage, options: SlideBuilderOptions): Slide {
  if (!page) {
    throw new Error("page is required");
  }
  if (!options) {
    throw new Error("options is required");
  }

  const shapes = convertPageToShapes(page, options);
  const background = buildSlideBackground(options);

  return {
    shapes,
    background,
  };
}

function buildSlideBackground(options: SlideBuilderOptions): Background | undefined {
  if (!options.setBackground) {
    return undefined;
  }
  return createBackground(options.backgroundColor ?? { r: 255, g: 255, b: 255 });
}

/**
 * 背景を作成
 */
function createBackground(color: { readonly r: number; readonly g: number; readonly b: number }): Background {
  const fill: Fill = {
    type: "solidFill",
    color: {
      spec: {
        type: "srgb",
        value: rgbToHex(color.r, color.g, color.b).toUpperCase(),
      },
    },
  };

  return { fill };
}

/**
 * SlideWithIdを生成
 */
export function createSlideWithId(slide: Slide, slideId: SlideId): SlideWithId {
  if (!slide) {
    throw new Error("slide is required");
  }
  if (typeof slideId !== "string" || slideId.length === 0) {
    throw new Error("slideId is required");
  }

  return { id: slideId, slide };
}

/**
 * 複数のSlideからSlideWithId配列を生成
 */
export function createSlidesWithIds(slides: readonly Slide[], startId: number = 1): SlideWithId[] {
  if (!slides) {
    throw new Error("slides is required");
  }
  if (!Number.isFinite(startId) || startId < 1) {
    throw new Error(`Invalid startId: ${startId}`);
  }

  return slides.map((slide, index) => ({
    id: String(startId + index) as SlideId,
    slide,
  }));
}

export type SlideSize = {
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * PDFページサイズからスライドサイズを決定
 * PDFサイズはポイント単位で渡される（1pt = 96/72 px）
 */
export function determineSlideSize(pdfWidth: number, pdfHeight: number, preferredSize?: SlideSize): SlideSize {
  if (!Number.isFinite(pdfWidth) || pdfWidth <= 0) {
    throw new Error(`Invalid pdfWidth: ${pdfWidth}`);
  }
  if (!Number.isFinite(pdfHeight) || pdfHeight <= 0) {
    throw new Error(`Invalid pdfHeight: ${pdfHeight}`);
  }

  if (preferredSize) {
    const w = preferredSize.width as number;
    const h = preferredSize.height as number;
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
      throw new Error(`Invalid preferredSize: ${w}x${h}`);
    }
    return preferredSize;
  }

  // PDFポイントからピクセルに変換
  const widthPx = Math.round(pdfWidth * PT_TO_PX);
  const heightPx = Math.round(pdfHeight * PT_TO_PX);

  return {
    width: px(widthPx),
    height: px(heightPx),
  };
}

/**
 * ページ番号を表示するテキストシェイプを作成
 */
export function createPageNumberShape(pageNumber: number, slideSize: SlideSize, shapeId: string): SpShape {
  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    throw new Error(`Invalid pageNumber: ${pageNumber}`);
  }
  if (!slideSize) {
    throw new Error("slideSize is required");
  }
  if (typeof shapeId !== "string" || shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const slideWidth = slideSize.width as number;
  const slideHeight = slideSize.height as number;
  if (!Number.isFinite(slideWidth) || slideWidth <= 0 || !Number.isFinite(slideHeight) || slideHeight <= 0) {
    throw new Error(`Invalid slideSize: ${slideWidth}x${slideHeight}`);
  }

  const text = String(pageNumber);
  const fontSizePt = 12;
  const padding = 10;

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `Page Number ${pageNumber}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: px(slideWidth - 50 - padding),
        y: px(slideHeight - 30 - padding),
        width: px(50),
        height: px(30),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry: {
        type: "preset",
        preset: "rect",
        adjustValues: [],
      },
      fill: { type: "noFill" },
    },
    textBody: {
      bodyProperties: {
        wrapping: "none",
        anchor: "center",
        anchorCenter: true,
      },
      paragraphs: [
        {
          properties: { alignment: "right" },
          runs: [
            {
              type: "text",
              text,
              properties: {
                fontSize: pt(fontSizePt),
                fill: {
                  type: "solidFill",
                  color: { spec: { type: "srgb", value: "808080" } },
                },
              },
            },
          ],
          endProperties: {},
        },
      ],
    },
  };
}
