/**
 * @file Auto-numbering format utilities for ECMA-376 compliance
 *
 * Implements ST_TextAutonumberScheme (ECMA-376 Part 1, 21.1.2.1.32)
 * for bullet auto-numbering in PowerPoint presentations.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.32
 */

/**
 * ECMA-376 ST_TextAutonumberScheme types.
 * Each scheme defines how auto-numbered bullets are formatted.
 *
 * @see ECMA-376 Part 1, 21.1.2.1.32
 */
export type TextAutonumberScheme =
  // Arabic numerals with various suffixes
  | "alphaLcParenBoth"   // (a), (b), (c), ...
  | "alphaLcParenR"      // a), b), c), ...
  | "alphaLcPeriod"      // a., b., c., ...
  | "alphaUcParenBoth"   // (A), (B), (C), ...
  | "alphaUcParenR"      // A), B), C), ...
  | "alphaUcPeriod"      // A., B., C., ...
  | "arabicDbPeriod"     // .1, .2, .3, ... (double-byte)
  | "arabicDbPlain"      // 1, 2, 3, ... (double-byte)
  | "arabicParenBoth"    // (1), (2), (3), ...
  | "arabicParenR"       // 1), 2), 3), ...
  | "arabicPeriod"       // 1., 2., 3., ...
  | "arabicPlain"        // 1, 2, 3, ...
  | "circleNumDbPlain"   // ①, ②, ③, ... (double-byte circled)
  | "circleNumWdBlackPlain" // ❶, ❷, ❸, ... (black circled)
  | "circleNumWdWhitePlain" // ①, ②, ③, ... (white circled)
  | "ea1ChsPeriod"       // Chinese simplified 1-1, 1-2, ...
  | "ea1ChsPlain"        // Chinese simplified 1, 2, ...
  | "ea1ChtPeriod"       // Chinese traditional
  | "ea1ChtPlain"        // Chinese traditional
  | "ea1JpnChsDbPeriod"  // Japanese
  | "ea1JpnKorPeriod"    // Japanese/Korean
  | "ea1JpnKorPlain"     // Japanese/Korean
  | "hebrew2Minus"       // Hebrew with minus
  | "hindiAlpha1Period"  // Hindi alpha 1
  | "hindiAlphaPeriod"   // Hindi alpha
  | "hindiNumParenR"     // Hindi numbers )
  | "hindiNumPeriod"     // Hindi numbers .
  | "romanLcParenBoth"   // (i), (ii), (iii), ...
  | "romanLcParenR"      // i), ii), iii), ...
  | "romanLcPeriod"      // i., ii., iii., ...
  | "romanUcParenBoth"   // (I), (II), (III), ...
  | "romanUcParenR"      // I), II), III), ...
  | "romanUcPeriod"      // I., II., III., ...
  | "thaiAlphaParenBoth" // Thai alpha (x)
  | "thaiAlphaParenR"    // Thai alpha x)
  | "thaiAlphaPeriod"    // Thai alpha x.
  | "thaiNumParenBoth"   // Thai numbers (x)
  | "thaiNumParenR"      // Thai numbers x)
  | "thaiNumPeriod";     // Thai numbers x.

/**
 * Convert number to lowercase Roman numerals.
 */
function toRomanLower(num: number): string {
  if (num <= 0 || num > 3999) {
    return num.toString();
  }

  const romanNumerals: readonly [number, string][] = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];

  let result = "";
  let remaining = num;
  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

/**
 * Convert number to uppercase Roman numerals.
 */
function toRomanUpper(num: number): string {
  return toRomanLower(num).toUpperCase();
}

/**
 * Convert number to lowercase alphabetic (a, b, c, ..., z, aa, ab, ...).
 */
function toAlphaLower(num: number): string {
  if (num <= 0) {
    return num.toString();
  }

  let result = "";
  let n = num;
  while (n > 0) {
    n--; // Convert to 0-based
    result = String.fromCharCode(97 + (n % 26)) + result; // 97 = 'a'
    n = Math.floor(n / 26);
  }
  return result;
}

/**
 * Convert number to uppercase alphabetic (A, B, C, ..., Z, AA, AB, ...).
 */
function toAlphaUpper(num: number): string {
  return toAlphaLower(num).toUpperCase();
}

/**
 * Convert number to circled number (①, ②, ③, ...).
 * Falls back to plain number if out of range (1-20).
 */
function toCircledNumber(num: number): string {
  if (num >= 1 && num <= 20) {
    // Unicode circled numbers: ① = U+2460
    return String.fromCodePoint(0x2460 + num - 1);
  }
  return num.toString();
}

/**
 * Convert number to black circled number (❶, ❷, ❸, ...).
 * Falls back to plain number if out of range (1-10).
 */
function toBlackCircledNumber(num: number): string {
  if (num >= 1 && num <= 10) {
    // Unicode black circled numbers: ❶ = U+2776
    return String.fromCodePoint(0x2776 + num - 1);
  }
  // Fall back to regular circled for 11-20
  if (num >= 11 && num <= 20) {
    return toCircledNumber(num);
  }
  return num.toString();
}

/**
 * Convert number to double-byte (full-width) Arabic numerals.
 */
function toDoubleByteArabic(num: number): string {
  const str = num.toString();
  let result = "";
  for (const char of str) {
    const code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      // 0-9 -> full-width 0-9 (U+FF10 - U+FF19)
      result += String.fromCharCode(0xff10 + (code - 48));
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Format auto-number according to ECMA-376 scheme.
 *
 * @param scheme - The auto-number scheme from ST_TextAutonumberScheme
 * @param index - The 1-based index of the bullet point
 * @param startAt - The starting number (default: 1)
 * @returns Formatted bullet string
 *
 * @example
 * formatAutoNumber("arabicPeriod", 1, 1) // "1."
 * formatAutoNumber("romanLcParenR", 3, 1) // "iii)"
 * formatAutoNumber("alphaUcPeriod", 2, 1) // "B."
 */
export function formatAutoNumber(
  scheme: string,
  index: number,
  startAt = 1,
): string {
  const num = index + startAt - 1;

  switch (scheme as TextAutonumberScheme) {
    // Lowercase alphabetic
    case "alphaLcParenBoth":
      return `(${toAlphaLower(num)})`;
    case "alphaLcParenR":
      return `${toAlphaLower(num)})`;
    case "alphaLcPeriod":
      return `${toAlphaLower(num)}.`;

    // Uppercase alphabetic
    case "alphaUcParenBoth":
      return `(${toAlphaUpper(num)})`;
    case "alphaUcParenR":
      return `${toAlphaUpper(num)})`;
    case "alphaUcPeriod":
      return `${toAlphaUpper(num)}.`;

    // Arabic numerals
    case "arabicParenBoth":
      return `(${num})`;
    case "arabicParenR":
      return `${num})`;
    case "arabicPeriod":
      return `${num}.`;
    case "arabicPlain":
      return `${num}`;

    // Double-byte Arabic
    case "arabicDbPeriod":
      return `${toDoubleByteArabic(num)}.`;
    case "arabicDbPlain":
      return toDoubleByteArabic(num);

    // Circled numbers
    case "circleNumDbPlain":
    case "circleNumWdWhitePlain":
      return toCircledNumber(num);
    case "circleNumWdBlackPlain":
      return toBlackCircledNumber(num);

    // Lowercase Roman
    case "romanLcParenBoth":
      return `(${toRomanLower(num)})`;
    case "romanLcParenR":
      return `${toRomanLower(num)})`;
    case "romanLcPeriod":
      return `${toRomanLower(num)}.`;

    // Uppercase Roman
    case "romanUcParenBoth":
      return `(${toRomanUpper(num)})`;
    case "romanUcParenR":
      return `${toRomanUpper(num)})`;
    case "romanUcPeriod":
      return `${toRomanUpper(num)}.`;

    // East Asian (simplified fallback to Arabic with period)
    case "ea1ChsPeriod":
    case "ea1ChtPeriod":
    case "ea1JpnChsDbPeriod":
    case "ea1JpnKorPeriod":
      return `${num}.`;

    case "ea1ChsPlain":
    case "ea1ChtPlain":
    case "ea1JpnKorPlain":
      return `${num}`;

    // Hebrew (simplified fallback)
    case "hebrew2Minus":
      return `${num}-`;

    // Hindi (simplified fallback to Arabic)
    case "hindiAlpha1Period":
    case "hindiAlphaPeriod":
    case "hindiNumPeriod":
      return `${num}.`;
    case "hindiNumParenR":
      return `${num})`;

    // Thai (simplified fallback to Arabic)
    case "thaiAlphaParenBoth":
    case "thaiNumParenBoth":
      return `(${num})`;
    case "thaiAlphaParenR":
    case "thaiNumParenR":
      return `${num})`;
    case "thaiAlphaPeriod":
    case "thaiNumPeriod":
      return `${num}.`;

    // Unknown scheme - fallback to arabicPeriod
    default:
      return `${num}.`;
  }
}

/**
 * Check if a scheme is a valid ST_TextAutonumberScheme value.
 */
export function isValidAutonumberScheme(scheme: string): scheme is TextAutonumberScheme {
  const validSchemes: readonly string[] = [
    "alphaLcParenBoth",
    "alphaLcParenR",
    "alphaLcPeriod",
    "alphaUcParenBoth",
    "alphaUcParenR",
    "alphaUcPeriod",
    "arabicDbPeriod",
    "arabicDbPlain",
    "arabicParenBoth",
    "arabicParenR",
    "arabicPeriod",
    "arabicPlain",
    "circleNumDbPlain",
    "circleNumWdBlackPlain",
    "circleNumWdWhitePlain",
    "ea1ChsPeriod",
    "ea1ChsPlain",
    "ea1ChtPeriod",
    "ea1ChtPlain",
    "ea1JpnChsDbPeriod",
    "ea1JpnKorPeriod",
    "ea1JpnKorPlain",
    "hebrew2Minus",
    "hindiAlpha1Period",
    "hindiAlphaPeriod",
    "hindiNumParenR",
    "hindiNumPeriod",
    "romanLcParenBoth",
    "romanLcParenR",
    "romanLcPeriod",
    "romanUcParenBoth",
    "romanUcParenR",
    "romanUcPeriod",
    "thaiAlphaParenBoth",
    "thaiAlphaParenR",
    "thaiAlphaPeriod",
    "thaiNumParenBoth",
    "thaiNumParenR",
    "thaiNumPeriod",
  ];
  return validSchemes.includes(scheme);
}
