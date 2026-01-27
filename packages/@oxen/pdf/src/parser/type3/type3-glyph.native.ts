/**
 * @file src/pdf/parser/type3-glyph.native.ts
 *
 * Renders Type3 font glyph programs (`/CharProcs`) into parsed path elements.
 *
 * This is used to preserve visual output for icon fonts and other PDFs that
 * rely on Type3 glyphs instead of standard text fonts.
 */

import { tokenizeContentStream } from "../../domain/content-stream";
import type { PdfBBox } from "../../domain";
import { createGraphicsStateStack, multiplyMatrices, type FontInfo, type FontMappings, type PdfMatrix } from "../../domain";
import { createGfxOpsFromStack, createParser, type ParsedElement, type TextRun } from "../operator";
import type { ExtGStateParams } from "../graphics-state/ext-gstate.native";
import type { PdfPattern } from "../pattern/pattern.types";
import type { PdfShading } from "../shading/shading.types";

type Type3Info = NonNullable<FontInfo["type3"]>;

function computeType3GlyphToUserMatrix(
  textMatrix: PdfMatrix,
  type3: Type3Info,
  fontSize: number,
  horizontalScaling: number,
  textRise: number,
): PdfMatrix {
  const Th = horizontalScaling / 100;
  const scale: PdfMatrix = [fontSize * Th, 0, 0, fontSize, 0, 0];
  const rise: PdfMatrix = [1, 0, 0, 1, 0, textRise];
  return multiplyMatrices(multiplyMatrices(multiplyMatrices(type3.fontMatrix, scale), rise), textMatrix);
}

function advanceTextMatrixX(textMatrix: PdfMatrix, dx: number): PdfMatrix {
  const [a, b, c, d, e, f] = textMatrix;
  return [a, b, c, d, e + dx, f];
}

function computeGlyphDx(
  charCode: number,
  fontInfo: FontInfo,
  fontSize: number,
  charSpacing: number,
  wordSpacing: number,
  horizontalScaling: number,
): number {
  const Th = horizontalScaling / 100;
  const w0 = fontInfo.metrics.widths.get(charCode) ?? fontInfo.metrics.defaultWidth;
  const glyphWidth = (w0 * fontSize) / 1000;
  const isSpace = charCode === 32;
  return (glyphWidth + charSpacing + (isSpace ? wordSpacing : 0)) * Th;
}

function decodeCharProcBytes(bytes: Uint8Array): string {
  // CharProcs are PDF content streams (mostly ASCII). latin1 keeps 0x80-0xFF stable.
  return new TextDecoder("latin1").decode(bytes);
}

/**
 * Parse a Type3 text run and return all glyph elements (paths/images/text).
 *
 * The caller is responsible for applying any page-level filtering (clip, complexity)
 * and for mapping `/Do` names to the correct `/Resources` scope.
 */
export function renderType3TextRun(
  run: TextRun,
  fontInfo: FontInfo,
  type3: Type3Info,
  fontMappings: FontMappings,
  options: Readonly<{
    readonly extGState: ReadonlyMap<string, ExtGStateParams>;
    readonly shadings: ReadonlyMap<string, PdfShading>;
    readonly patterns: ReadonlyMap<string, PdfPattern>;
    readonly colorSpaces: ReadonlyMap<string, import("../color/color-space.native").ParsedNamedColorSpace>;
    readonly shadingMaxSize: number;
    readonly clipPathMaxSize: number;
    readonly pageBBox: PdfBBox;
  }>,
): readonly ParsedElement[] {
  if (fontInfo.codeByteWidth !== 1) {return [];}

  const out: ParsedElement[] = [];
  let textMatrix = run.textMatrix;

  for (let i = 0; i < run.text.length; i += 1) {
    const charCode = run.text.charCodeAt(i);
    const glyphName = type3.codeToCharName.get(charCode);

    if (glyphName) {
      const procBytes = type3.charProcs.get(glyphName);
      if (procBytes) {
        const glyphToUser = computeType3GlyphToUserMatrix(
          textMatrix,
          type3,
          run.fontSize,
          run.horizontalScaling,
          run.textRise,
        );

        const stack = createGraphicsStateStack(run.graphicsState);
        stack.concatMatrix(glyphToUser);

        const gfxOps = createGfxOpsFromStack(stack);
        const parse = createParser(gfxOps, fontMappings, {
          extGState: options.extGState,
          shadings: options.shadings,
          patterns: options.patterns,
          colorSpaces: options.colorSpaces,
          shadingMaxSize: options.shadingMaxSize,
          clipPathMaxSize: options.clipPathMaxSize,
          pageBBox: options.pageBBox,
        });
        const tokens = tokenizeContentStream(decodeCharProcBytes(procBytes));
        out.push(...parse(tokens));
      }
    }

    const dx = computeGlyphDx(
      charCode,
      fontInfo,
      run.fontSize,
      run.charSpacing,
      run.wordSpacing,
      run.horizontalScaling,
    );
    textMatrix = advanceTextMatrixX(textMatrix, dx);
  }

  return out;
}
