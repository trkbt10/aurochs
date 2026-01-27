/**
 * @file src/pdf/native/encryption/saslprep.ts
 */

import {
  SASLPREP_BIDI_L,
  SASLPREP_BIDI_R_AL,
  SASLPREP_COMMONLY_MAPPED_TO_NOTHING,
  SASLPREP_NON_ASCII_CONTROL_CHARACTERS,
  SASLPREP_NON_ASCII_SPACE_CHARACTERS,
  SASLPREP_NON_CHARACTER_CODEPOINTS,
  SASLPREP_PROHIBITED_CHARACTERS,
  SASLPREP_UNASSIGNED_CODE_POINTS,
} from "./saslprep.tables";

export type SaslprepOptions = Readonly<{
  readonly allowUnassigned?: boolean;
}>;

function inRange(value: number, rangeGroup: readonly number[]): boolean {
  if (value < (rangeGroup[0] ?? 0)) return false;
  let startRange = 0;
  let endRange = rangeGroup.length / 2;
  while (startRange <= endRange) {
    const middleRange = Math.floor((startRange + endRange) / 2);
    const arrayIndex = middleRange * 2;
    const start = rangeGroup[arrayIndex] ?? 0;
    const end = rangeGroup[arrayIndex + 1] ?? 0;
    if (value >= start && value <= end) {
      return true;
    }
    if (value > end) {
      startRange = middleRange + 1;
    } else {
      endRange = middleRange - 1;
    }
  }
  return false;
}

function isNonASCIISpaceCharacter(cp: number): boolean {
  return inRange(cp, SASLPREP_NON_ASCII_SPACE_CHARACTERS);
}

function isCommonlyMappedToNothing(cp: number): boolean {
  return inRange(cp, SASLPREP_COMMONLY_MAPPED_TO_NOTHING);
}

function isProhibitedCharacter(cp: number): boolean {
  return (
    inRange(cp, SASLPREP_NON_ASCII_SPACE_CHARACTERS) ||
    inRange(cp, SASLPREP_PROHIBITED_CHARACTERS) ||
    inRange(cp, SASLPREP_NON_ASCII_CONTROL_CHARACTERS) ||
    inRange(cp, SASLPREP_NON_CHARACTER_CODEPOINTS)
  );
}

function isUnassignedCodePoint(cp: number): boolean {
  return inRange(cp, SASLPREP_UNASSIGNED_CODE_POINTS);
}

function isBidirectionalRAL(cp: number): boolean {
  return inRange(cp, SASLPREP_BIDI_R_AL);
}

function isBidirectionalL(cp: number): boolean {
  return inRange(cp, SASLPREP_BIDI_L);
}

function toCodePoints(input: string): number[] {
  const codepoints: number[] = [];
  const size = input.length;
  for (let i = 0; i < size; i += 1) {
    const before = input.charCodeAt(i);
    if (before >= 0xd800 && before <= 0xdbff && size > i + 1) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codepoints.push((before - 0xd800) * 0x400 + next - 0xdc00 + 0x10000);
        i += 1;
        continue;
      }
    }
    codepoints.push(before);
  }
  return codepoints;
}

function getCodePoint(character: string | undefined): number {
  const s = character ?? "";
  return s.codePointAt(0) ?? 0;
}

/**
 * SASLprep implementation for PDF Standard Security Handler R=5/R=6 password processing.
 *
 * Based on RFC 4013 / RFC 3454 tables (Unicode 3.2), matching pdfkit behavior.
 */
export function saslprep(input: string, opts: SaslprepOptions = {}): string {
  if (typeof input !== "string") {
    throw new TypeError("Expected string.");
  }
  if (input.length === 0) {
    return "";
  }

  // 1) Map to space / remove commonly-mapped-to-nothing.
  const mappedInput = toCodePoints(input)
    .map((cp) => (isNonASCIISpaceCharacter(cp) ? 0x20 : cp))
    .filter((cp) => !isCommonlyMappedToNothing(cp));

  // 2) Normalize to NFKC.
  const normalizedInput = String.fromCodePoint(...mappedInput).normalize("NFKC");
  const normalizedMap = toCodePoints(normalizedInput);

  // 3) Prohibited output.
  const hasProhibited = normalizedMap.some(isProhibitedCharacter);
  if (hasProhibited) {
    throw new Error("Prohibited character, see https://tools.ietf.org/html/rfc4013#section-2.3");
  }

  // 4) Unassigned code points.
  if (opts.allowUnassigned !== true) {
    const hasUnassigned = normalizedMap.some(isUnassignedCodePoint);
    if (hasUnassigned) {
      throw new Error("Unassigned code point, see https://tools.ietf.org/html/rfc4013#section-2.5");
    }
  }

  // 5) Bidirectional check.
  const hasBidiRAL = normalizedMap.some(isBidirectionalRAL);
  const hasBidiL = normalizedMap.some(isBidirectionalL);
  if (hasBidiRAL && hasBidiL) {
    throw new Error("String must not contain RandALCat and LCat at the same time, see https://tools.ietf.org/html/rfc3454#section-6");
  }
  const isFirstBidiRAL = isBidirectionalRAL(getCodePoint(normalizedInput[0]));
  const isLastBidiRAL = isBidirectionalRAL(getCodePoint(normalizedInput[normalizedInput.length - 1]));
  if (hasBidiRAL && !(isFirstBidiRAL && isLastBidiRAL)) {
    throw new Error("Bidirectional RandALCat character must be the first and the last character of the string, see https://tools.ietf.org/html/rfc3454#section-6");
  }

  return normalizedInput;
}

