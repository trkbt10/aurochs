/**
 * @file PdfText → SpShape (textbox) converter
 */

import type { PdfText } from "../domain";
import type { SpShape } from "../../pptx/domain/shape";
import type { Paragraph, TextBody, TextRun } from "../../pptx/domain/text";
import type { Points } from "../../ooxml/domain/units";
import { deg, pt, px } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertPoint, convertSize } from "./transform-converter";
import { convertFill } from "./color-converter";
import { mapFontName, isBoldFont, isItalicFont, normalizeFontName } from "../domain/font";

/**
 * PdfTextをSpShape（テキストボックス）に変換
 */
export function convertTextToShape(
  pdfText: PdfText,
  context: ConversionContext,
  shapeId: string
): SpShape {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }
  if (!Number.isFinite(pdfText.x) || !Number.isFinite(pdfText.y)) {
    throw new Error(`Invalid PdfText position: (${pdfText.x}, ${pdfText.y})`);
  }
  if (!Number.isFinite(pdfText.width) || pdfText.width < 0) {
    throw new Error(`Invalid PdfText width: ${pdfText.width}`);
  }
  if (!Number.isFinite(pdfText.height) || pdfText.height < 0) {
    throw new Error(`Invalid PdfText height: ${pdfText.height}`);
  }

  const position = convertPoint({ x: pdfText.x, y: pdfText.y }, context);
  const size = convertSize(pdfText.width, pdfText.height, context);
  const textBody = createTextBody(pdfText);

  return {
    type: "sp",
    nonVisual: {
      id: shapeId,
      name: `TextBox ${shapeId}`,
      textBox: true,
    },
    properties: {
      transform: {
        x: position.x,
        y: px((position.y as number) - (size.height as number)),
        width: size.width,
        height: size.height,
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
    textBody,
  };
}

/**
 * TextBodyを構築
 */
function createTextBody(pdfText: PdfText): TextBody {
  const paragraph = createParagraph(pdfText);

  return {
    bodyProperties: {
      wrapping: "none",
      anchor: "top",
      anchorCenter: false,
    },
    paragraphs: [paragraph],
  };
}

/**
 * Paragraphを構築
 */
function createParagraph(pdfText: PdfText): Paragraph {
  const textRun = createTextRun(pdfText);

  return {
    properties: {
      alignment: "left",
    },
    runs: [textRun],
    endProperties: {},
  };
}

/**
 * TextRunを構築
 */
function createTextRun(pdfText: PdfText): TextRun {
  const normalizedName = normalizeFontName(pdfText.fontName);

  return {
    type: "text",
    text: pdfText.text,
    properties: {
      fontSize: convertFontSize(pdfText.fontSize),
      fontFamily: mapFontName(pdfText.fontName),
      fill: convertFill(pdfText.graphicsState.fillColor, pdfText.graphicsState.fillAlpha),
      bold: isBoldFont(normalizedName),
      italic: isItalicFont(normalizedName),
      underline: "none",
    },
  };
}

/**
 * PDFフォントサイズをPPTXフォントサイズに変換
 * PDFとPPTXは共にポイント単位
 * 内部のPoints型は実際のポイント値を保持する
 */
function convertFontSize(pdfFontSize: number): Points {
  if (!Number.isFinite(pdfFontSize) || pdfFontSize <= 0) {
    throw new Error(`Invalid pdfFontSize: ${pdfFontSize}`);
  }
  return pt(pdfFontSize);
}

