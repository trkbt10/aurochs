/**
 * @file SVG span measurement helper
 *
 * Measures layout spans using the browser SVG text engine so cursor/selection
 * mapping matches the rendered glyph positions.
 */

import type { LayoutSpan } from "../../text-layout";
import { px } from "../../../domain/types";
import { PT_TO_PX } from "../../../domain/unit-conversion";
import { applyTextTransform } from "../primitives/text/text-utils";
import { ensureSvgTextNode, normalizeSpaces, setTextAttributes } from "./svg-text-measure";

function buildFontFamily(span: LayoutSpan): string {
  const families = [span.fontFamily];

  if (span.fontFamilyEastAsian !== undefined) {
    families.push(span.fontFamilyEastAsian);
  }

  if (span.fontFamilyComplexScript !== undefined && span.fontFamilyComplexScript !== span.fontFamily) {
    families.push(span.fontFamilyComplexScript);
  }

  if (span.fontFamilySymbol !== undefined && span.fontFamilySymbol !== span.fontFamily) {
    families.push(span.fontFamilySymbol);
  }

  return families.join(", ");
}






export function measureLayoutSpanTextWidth(span: LayoutSpan, text: string): ReturnType<typeof px> {
  const textNode = ensureSvgTextNode();
  if (!textNode) {
    return px(0);
  }

  const fontSizePx = (span.fontSize as number) * PT_TO_PX;
  setTextAttributes(textNode, {
    "font-size": `${fontSizePx}px`,
    "font-style": span.fontStyle,
    "font-weight": `${span.fontWeight}`,
    "font-family": buildFontFamily(span),
    "letter-spacing": `${(span.letterSpacing as number) || 0}px`,
    "xml:space": "preserve",
  });

  if (span.kerning !== undefined) {
    const fontSize = span.fontSize as number;
    textNode.setAttribute("font-kerning", fontSize >= (span.kerning as number) ? "normal" : "none");
  }

  const transformedText = applyTextTransform(text, span.textTransform);
  textNode.textContent = normalizeSpaces(transformedText);

  return px(textNode.getComputedTextLength());
}
