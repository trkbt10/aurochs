/**
 * @file Extract text content from PPT records
 */

import type { PptRecord } from "../records/types";
import { RT } from "../records/record-types";
import { findChildByType, findChildrenByType } from "../records/record-iterator";
import {
  parseTextHeaderAtom, decodeTextCharsAtom, decodeTextBytesAtom,
  parseStyleTextPropAtom, parseFontEntityAtom,
  type ParagraphStyleRun, type CharacterStyleRun,
} from "../records/atoms/text";
import { resolveColor, type ColorScheme, DEFAULT_COLOR_SCHEME } from "../records/atoms/color";
import type { PptTextBody, PptTextParagraph, PptTextRun, PptBullet } from "../domain/types";

/**
 * Extract text bodies from a container's children.
 * PPT stores text as TextHeaderAtom + (TextCharsAtom | TextBytesAtom) + StyleTextPropAtom sequences.
 */
export function extractTextBodies(
  children: readonly PptRecord[],
  fonts: readonly string[],
  colorScheme: ColorScheme,
): readonly PptTextBody[] {
  const bodies: PptTextBody[] = [];
  let i = 0;

  while (i < children.length) {
    const rec = children[i];

    if (rec.recType === RT.TextHeaderAtom) {
      const { textBody, consumed } = extractOneTextBody(children, i, fonts, colorScheme);
      if (textBody) {
        bodies.push(textBody);
      }
      i += consumed;
    } else {
      i++;
    }
  }

  return bodies;
}

function extractOneTextBody(
  children: readonly PptRecord[],
  startIndex: number,
  fonts: readonly string[],
  colorScheme: ColorScheme,
): { textBody: PptTextBody | undefined; consumed: number } {
  let idx = startIndex + 1; // skip TextHeaderAtom
  let rawText: string | undefined;
  let styleRecord: PptRecord | undefined;

  // Look for the text and style records that follow
  while (idx < children.length) {
    const rec = children[idx];
    if (rec.recType === RT.TextCharsAtom) {
      rawText = decodeTextCharsAtom(rec);
      idx++;
    } else if (rec.recType === RT.TextBytesAtom) {
      rawText = decodeTextBytesAtom(rec);
      idx++;
    } else if (rec.recType === RT.StyleTextPropAtom) {
      styleRecord = rec;
      idx++;
    } else if (rec.recType === RT.TextHeaderAtom) {
      // Next text block starts
      break;
    } else {
      idx++;
      // Skip other records between text atoms (e.g., TextSpecialInfoAtom, TextRulerAtom)
      if (rec.recType === RT.TextHeaderAtom) break;
    }
  }

  if (rawText === undefined) {
    return { textBody: undefined, consumed: idx - startIndex };
  }

  const textLength = rawText.length;
  let paragraphRuns: readonly ParagraphStyleRun[] = [];
  let characterRuns: readonly CharacterStyleRun[] = [];

  if (styleRecord) {
    const styleData = parseStyleTextPropAtom(styleRecord, textLength);
    paragraphRuns = styleData.paragraphRuns;
    characterRuns = styleData.characterRuns;
  }

  const paragraphs = buildParagraphs(rawText, paragraphRuns, characterRuns, fonts, colorScheme);

  return {
    textBody: { paragraphs },
    consumed: idx - startIndex,
  };
}

function buildParagraphs(
  rawText: string,
  paragraphRuns: readonly ParagraphStyleRun[],
  characterRuns: readonly CharacterStyleRun[],
  fonts: readonly string[],
  colorScheme: ColorScheme,
): readonly PptTextParagraph[] {
  // Split text into lines (PPT uses CR as paragraph separator)
  const lines = rawText.split("\r");
  const paragraphs: PptTextParagraph[] = [];

  // Track character position for style run matching
  let charPos = 0;
  let paraRunIdx = 0;
  let charRunIdx = 0;
  let charRunOffset = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx];
    // Account for CR separator (1 char) except for the last line
    const lineLength = lineText.length + (lineIdx < lines.length - 1 ? 1 : 0);

    // Get paragraph style
    const paraStyle = paragraphRuns[paraRunIdx];

    // Build runs for this paragraph
    const runs: PptTextRun[] = [];
    let linePos = 0;

    while (linePos < lineText.length) {
      const charStyle = characterRuns[charRunIdx];
      const remainingInRun = charStyle ? (charStyle.charCount - charRunOffset) : lineText.length;
      const charsToTake = Math.min(remainingInRun, lineText.length - linePos);

      if (charsToTake > 0) {
        const text = lineText.substring(linePos, linePos + charsToTake);
        runs.push({
          text,
          properties: buildRunProperties(charStyle, fonts, colorScheme),
        });
      }

      linePos += charsToTake;
      charRunOffset += charsToTake;

      if (charStyle && charRunOffset >= charStyle.charCount) {
        charRunIdx++;
        charRunOffset = 0;
      }
    }

    // If no runs were created, add an empty run
    if (runs.length === 0) {
      runs.push({ text: "", properties: {} });
    }

    // Derive indentation level: use `indent` field if set, otherwise infer from leftMargin
    const level = deriveLevel(paraStyle);

    const paragraph: PptTextParagraph = {
      runs,
      ...(paraStyle?.alignment !== undefined ? { alignment: alignmentToString(paraStyle.alignment) } : {}),
      ...(level > 0 ? { level } : {}),
      ...(paraStyle?.bulletFlags !== undefined ? { bullet: buildBullet(paraStyle) } : {}),
      ...(paraStyle?.lineSpacing !== undefined ? { lineSpacing: paraStyle.lineSpacing } : {}),
      ...(paraStyle?.spaceBefore !== undefined ? { spaceBefore: paraStyle.spaceBefore } : {}),
      ...(paraStyle?.spaceAfter !== undefined ? { spaceAfter: paraStyle.spaceAfter } : {}),
    };

    paragraphs.push(paragraph);

    // Advance character position past this line + CR
    charPos += lineLength;
    charRunOffset += (lineIdx < lines.length - 1 ? 1 : 0); // CR character
    if (characterRuns[charRunIdx] && charRunOffset >= characterRuns[charRunIdx].charCount) {
      charRunIdx++;
      charRunOffset = 0;
    }

    // Advance paragraph run
    if (paraStyle) {
      paraRunIdx++;
    }
  }

  return paragraphs;
}

function buildRunProperties(
  charStyle: CharacterStyleRun | undefined,
  fonts: readonly string[],
  colorScheme: ColorScheme,
): PptTextRun["properties"] {
  if (!charStyle) return {};

  return {
    ...(charStyle.bold ? { bold: true } : {}),
    ...(charStyle.italic ? { italic: true } : {}),
    ...(charStyle.underline ? { underline: true } : {}),
    ...(charStyle.strikethrough ? { strikethrough: true } : {}),
    ...(charStyle.fontSize !== undefined ? { fontSize: charStyle.fontSize } : {}),
    ...(charStyle.fontRef !== undefined && fonts[charStyle.fontRef] ? { fontFamily: fonts[charStyle.fontRef] } : {}),
    ...(charStyle.color !== undefined ? { color: resolveColor(charStyle.color, colorScheme) } : {}),
  };
}

function alignmentToString(alignment: number): PptTextParagraph["alignment"] {
  switch (alignment) {
    case 0: return "left";
    case 1: return "center";
    case 2: return "right";
    case 3: return "justify";
    default: return undefined;
  }
}

/**
 * Derive bullet indentation level from paragraph style.
 * PPT stores the level in `indent` field, but some generators (python-pptx)
 * use `leftMargin` instead (288 EMU per level step).
 */
function deriveLevel(paraStyle: ParagraphStyleRun | undefined): number {
  if (!paraStyle) return 0;
  if (paraStyle.indent !== undefined && paraStyle.indent > 0) return paraStyle.indent;
  if (paraStyle.leftMargin !== undefined && paraStyle.leftMargin > 0) {
    // Typical leftMargin step is 228600 EMU (0.25 inch) or 285750 (≈288 in some PPTs)
    // Use 228600 as base step (most common). Round to nearest level.
    return Math.min(Math.round(paraStyle.leftMargin / 228600), 8);
  }
  return 0;
}

function buildBullet(paraStyle: ParagraphStyleRun): PptBullet | undefined {
  if (!paraStyle.bulletFlags) return undefined;
  const hasBullet = !!(paraStyle.bulletFlags & 0x0F);
  if (!hasBullet) return { type: "none" };

  if (paraStyle.bulletChar !== undefined) {
    return { type: "char", char: String.fromCharCode(paraStyle.bulletChar) };
  }

  return { type: "autoNumber" };
}
