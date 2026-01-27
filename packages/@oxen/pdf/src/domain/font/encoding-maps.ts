/**
 * @file PDF Font Encoding Maps
 *
 * Standard character encodings used in PDF fonts (ISO 32000-1, Annex D).
 * These mappings convert single-byte character codes to Unicode strings.
 *
 * PDF supports several predefined encodings:
 * - WinAnsiEncoding: Windows code page 1252 (most common for Western PDFs)
 * - MacRomanEncoding: Mac OS Roman character set
 * - StandardEncoding: Adobe Standard Encoding (PostScript Type 1 default)
 *
 * When a font has an /Encoding entry with one of these names, the corresponding
 * mapping is used instead of ToUnicode CMap for character decoding.
 */

/**
 * WinAnsiEncoding (Windows Code Page 1252)
 *
 * Most commonly used encoding for Western PDFs created on Windows.
 * ISO 32000-1, Annex D, Table D.1
 *
 * Character codes 0x00-0x1F and 0x7F are control characters (pass through).
 * Character codes 0x80-0x9F contain special characters (Euro, quotes, etc.).
 */
export const WINANSI_ENCODING: ReadonlyMap<number, string> = new Map<number, string>([
  // 0x20-0x7E: Standard ASCII printable characters
  [0x20, " "],
  [0x21, "!"],
  [0x22, '"'],
  [0x23, "#"],
  [0x24, "$"],
  [0x25, "%"],
  [0x26, "&"],
  [0x27, "'"],
  [0x28, "("],
  [0x29, ")"],
  [0x2a, "*"],
  [0x2b, "+"],
  [0x2c, ","],
  [0x2d, "-"],
  [0x2e, "."],
  [0x2f, "/"],
  [0x30, "0"],
  [0x31, "1"],
  [0x32, "2"],
  [0x33, "3"],
  [0x34, "4"],
  [0x35, "5"],
  [0x36, "6"],
  [0x37, "7"],
  [0x38, "8"],
  [0x39, "9"],
  [0x3a, ":"],
  [0x3b, ";"],
  [0x3c, "<"],
  [0x3d, "="],
  [0x3e, ">"],
  [0x3f, "?"],
  [0x40, "@"],
  [0x41, "A"],
  [0x42, "B"],
  [0x43, "C"],
  [0x44, "D"],
  [0x45, "E"],
  [0x46, "F"],
  [0x47, "G"],
  [0x48, "H"],
  [0x49, "I"],
  [0x4a, "J"],
  [0x4b, "K"],
  [0x4c, "L"],
  [0x4d, "M"],
  [0x4e, "N"],
  [0x4f, "O"],
  [0x50, "P"],
  [0x51, "Q"],
  [0x52, "R"],
  [0x53, "S"],
  [0x54, "T"],
  [0x55, "U"],
  [0x56, "V"],
  [0x57, "W"],
  [0x58, "X"],
  [0x59, "Y"],
  [0x5a, "Z"],
  [0x5b, "["],
  [0x5c, "\\"],
  [0x5d, "]"],
  [0x5e, "^"],
  [0x5f, "_"],
  [0x60, "`"],
  [0x61, "a"],
  [0x62, "b"],
  [0x63, "c"],
  [0x64, "d"],
  [0x65, "e"],
  [0x66, "f"],
  [0x67, "g"],
  [0x68, "h"],
  [0x69, "i"],
  [0x6a, "j"],
  [0x6b, "k"],
  [0x6c, "l"],
  [0x6d, "m"],
  [0x6e, "n"],
  [0x6f, "o"],
  [0x70, "p"],
  [0x71, "q"],
  [0x72, "r"],
  [0x73, "s"],
  [0x74, "t"],
  [0x75, "u"],
  [0x76, "v"],
  [0x77, "w"],
  [0x78, "x"],
  [0x79, "y"],
  [0x7a, "z"],
  [0x7b, "{"],
  [0x7c, "|"],
  [0x7d, "}"],
  [0x7e, "~"],
  // 0x80-0x9F: WinAnsi-specific characters
  [0x80, "\u20AC"], // Euro Sign
  // 0x81 undefined
  [0x82, "\u201A"], // Single Low-9 Quotation Mark
  [0x83, "\u0192"], // Latin Small Letter F with Hook (florin)
  [0x84, "\u201E"], // Double Low-9 Quotation Mark
  [0x85, "\u2026"], // Horizontal Ellipsis
  [0x86, "\u2020"], // Dagger
  [0x87, "\u2021"], // Double Dagger
  [0x88, "\u02C6"], // Modifier Letter Circumflex Accent
  [0x89, "\u2030"], // Per Mille Sign
  [0x8a, "\u0160"], // Latin Capital Letter S with Caron
  [0x8b, "\u2039"], // Single Left-Pointing Angle Quotation Mark
  [0x8c, "\u0152"], // Latin Capital Ligature OE
  // 0x8D undefined
  [0x8e, "\u017D"], // Latin Capital Letter Z with Caron
  // 0x8F undefined
  // 0x90 undefined
  [0x91, "\u2018"], // Left Single Quotation Mark
  [0x92, "\u2019"], // Right Single Quotation Mark
  [0x93, "\u201C"], // Left Double Quotation Mark
  [0x94, "\u201D"], // Right Double Quotation Mark
  [0x95, "\u2022"], // Bullet
  [0x96, "\u2013"], // En Dash
  [0x97, "\u2014"], // Em Dash
  [0x98, "\u02DC"], // Small Tilde
  [0x99, "\u2122"], // Trade Mark Sign
  [0x9a, "\u0161"], // Latin Small Letter S with Caron
  [0x9b, "\u203A"], // Single Right-Pointing Angle Quotation Mark
  [0x9c, "\u0153"], // Latin Small Ligature OE
  // 0x9D undefined
  [0x9e, "\u017E"], // Latin Small Letter Z with Caron
  [0x9f, "\u0178"], // Latin Capital Letter Y with Diaeresis
  // 0xA0-0xFF: Latin-1 Supplement
  [0xa0, "\u00A0"], // No-Break Space
  [0xa1, "\u00A1"], // Inverted Exclamation Mark
  [0xa2, "\u00A2"], // Cent Sign
  [0xa3, "\u00A3"], // Pound Sign
  [0xa4, "\u00A4"], // Currency Sign
  [0xa5, "\u00A5"], // Yen Sign
  [0xa6, "\u00A6"], // Broken Bar
  [0xa7, "\u00A7"], // Section Sign
  [0xa8, "\u00A8"], // Diaeresis
  [0xa9, "\u00A9"], // Copyright Sign
  [0xaa, "\u00AA"], // Feminine Ordinal Indicator
  [0xab, "\u00AB"], // Left-Pointing Double Angle Quotation Mark
  [0xac, "\u00AC"], // Not Sign
  [0xad, "\u00AD"], // Soft Hyphen
  [0xae, "\u00AE"], // Registered Sign
  [0xaf, "\u00AF"], // Macron
  [0xb0, "\u00B0"], // Degree Sign
  [0xb1, "\u00B1"], // Plus-Minus Sign
  [0xb2, "\u00B2"], // Superscript Two
  [0xb3, "\u00B3"], // Superscript Three
  [0xb4, "\u00B4"], // Acute Accent
  [0xb5, "\u00B5"], // Micro Sign
  [0xb6, "\u00B6"], // Pilcrow Sign
  [0xb7, "\u00B7"], // Middle Dot
  [0xb8, "\u00B8"], // Cedilla
  [0xb9, "\u00B9"], // Superscript One
  [0xba, "\u00BA"], // Masculine Ordinal Indicator
  [0xbb, "\u00BB"], // Right-Pointing Double Angle Quotation Mark
  [0xbc, "\u00BC"], // Vulgar Fraction One Quarter
  [0xbd, "\u00BD"], // Vulgar Fraction One Half
  [0xbe, "\u00BE"], // Vulgar Fraction Three Quarters
  [0xbf, "\u00BF"], // Inverted Question Mark
  [0xc0, "\u00C0"], // Latin Capital Letter A with Grave
  [0xc1, "\u00C1"], // Latin Capital Letter A with Acute
  [0xc2, "\u00C2"], // Latin Capital Letter A with Circumflex
  [0xc3, "\u00C3"], // Latin Capital Letter A with Tilde
  [0xc4, "\u00C4"], // Latin Capital Letter A with Diaeresis
  [0xc5, "\u00C5"], // Latin Capital Letter A with Ring Above
  [0xc6, "\u00C6"], // Latin Capital Letter AE
  [0xc7, "\u00C7"], // Latin Capital Letter C with Cedilla
  [0xc8, "\u00C8"], // Latin Capital Letter E with Grave
  [0xc9, "\u00C9"], // Latin Capital Letter E with Acute
  [0xca, "\u00CA"], // Latin Capital Letter E with Circumflex
  [0xcb, "\u00CB"], // Latin Capital Letter E with Diaeresis
  [0xcc, "\u00CC"], // Latin Capital Letter I with Grave
  [0xcd, "\u00CD"], // Latin Capital Letter I with Acute
  [0xce, "\u00CE"], // Latin Capital Letter I with Circumflex
  [0xcf, "\u00CF"], // Latin Capital Letter I with Diaeresis
  [0xd0, "\u00D0"], // Latin Capital Letter Eth
  [0xd1, "\u00D1"], // Latin Capital Letter N with Tilde
  [0xd2, "\u00D2"], // Latin Capital Letter O with Grave
  [0xd3, "\u00D3"], // Latin Capital Letter O with Acute
  [0xd4, "\u00D4"], // Latin Capital Letter O with Circumflex
  [0xd5, "\u00D5"], // Latin Capital Letter O with Tilde
  [0xd6, "\u00D6"], // Latin Capital Letter O with Diaeresis
  [0xd7, "\u00D7"], // Multiplication Sign
  [0xd8, "\u00D8"], // Latin Capital Letter O with Stroke
  [0xd9, "\u00D9"], // Latin Capital Letter U with Grave
  [0xda, "\u00DA"], // Latin Capital Letter U with Acute
  [0xdb, "\u00DB"], // Latin Capital Letter U with Circumflex
  [0xdc, "\u00DC"], // Latin Capital Letter U with Diaeresis
  [0xdd, "\u00DD"], // Latin Capital Letter Y with Acute
  [0xde, "\u00DE"], // Latin Capital Letter Thorn
  [0xdf, "\u00DF"], // Latin Small Letter Sharp S
  [0xe0, "\u00E0"], // Latin Small Letter A with Grave
  [0xe1, "\u00E1"], // Latin Small Letter A with Acute
  [0xe2, "\u00E2"], // Latin Small Letter A with Circumflex
  [0xe3, "\u00E3"], // Latin Small Letter A with Tilde
  [0xe4, "\u00E4"], // Latin Small Letter A with Diaeresis
  [0xe5, "\u00E5"], // Latin Small Letter A with Ring Above
  [0xe6, "\u00E6"], // Latin Small Letter AE
  [0xe7, "\u00E7"], // Latin Small Letter C with Cedilla
  [0xe8, "\u00E8"], // Latin Small Letter E with Grave
  [0xe9, "\u00E9"], // Latin Small Letter E with Acute
  [0xea, "\u00EA"], // Latin Small Letter E with Circumflex
  [0xeb, "\u00EB"], // Latin Small Letter E with Diaeresis
  [0xec, "\u00EC"], // Latin Small Letter I with Grave
  [0xed, "\u00ED"], // Latin Small Letter I with Acute
  [0xee, "\u00EE"], // Latin Small Letter I with Circumflex
  [0xef, "\u00EF"], // Latin Small Letter I with Diaeresis
  [0xf0, "\u00F0"], // Latin Small Letter Eth
  [0xf1, "\u00F1"], // Latin Small Letter N with Tilde
  [0xf2, "\u00F2"], // Latin Small Letter O with Grave
  [0xf3, "\u00F3"], // Latin Small Letter O with Acute
  [0xf4, "\u00F4"], // Latin Small Letter O with Circumflex
  [0xf5, "\u00F5"], // Latin Small Letter O with Tilde
  [0xf6, "\u00F6"], // Latin Small Letter O with Diaeresis
  [0xf7, "\u00F7"], // Division Sign
  [0xf8, "\u00F8"], // Latin Small Letter O with Stroke
  [0xf9, "\u00F9"], // Latin Small Letter U with Grave
  [0xfa, "\u00FA"], // Latin Small Letter U with Acute
  [0xfb, "\u00FB"], // Latin Small Letter U with Circumflex
  [0xfc, "\u00FC"], // Latin Small Letter U with Diaeresis
  [0xfd, "\u00FD"], // Latin Small Letter Y with Acute
  [0xfe, "\u00FE"], // Latin Small Letter Thorn
  [0xff, "\u00FF"], // Latin Small Letter Y with Diaeresis
]);

/**
 * MacRomanEncoding (Mac OS Roman)
 *
 * Character encoding used on classic Mac OS systems.
 * ISO 32000-1, Annex D, Table D.2
 */
export const MACROMAN_ENCODING: ReadonlyMap<number, string> = new Map<number, string>([
  // 0x20-0x7E: Standard ASCII printable characters (same as WinAnsi)
  [0x20, " "],
  [0x21, "!"],
  [0x22, '"'],
  [0x23, "#"],
  [0x24, "$"],
  [0x25, "%"],
  [0x26, "&"],
  [0x27, "'"],
  [0x28, "("],
  [0x29, ")"],
  [0x2a, "*"],
  [0x2b, "+"],
  [0x2c, ","],
  [0x2d, "-"],
  [0x2e, "."],
  [0x2f, "/"],
  [0x30, "0"],
  [0x31, "1"],
  [0x32, "2"],
  [0x33, "3"],
  [0x34, "4"],
  [0x35, "5"],
  [0x36, "6"],
  [0x37, "7"],
  [0x38, "8"],
  [0x39, "9"],
  [0x3a, ":"],
  [0x3b, ";"],
  [0x3c, "<"],
  [0x3d, "="],
  [0x3e, ">"],
  [0x3f, "?"],
  [0x40, "@"],
  [0x41, "A"],
  [0x42, "B"],
  [0x43, "C"],
  [0x44, "D"],
  [0x45, "E"],
  [0x46, "F"],
  [0x47, "G"],
  [0x48, "H"],
  [0x49, "I"],
  [0x4a, "J"],
  [0x4b, "K"],
  [0x4c, "L"],
  [0x4d, "M"],
  [0x4e, "N"],
  [0x4f, "O"],
  [0x50, "P"],
  [0x51, "Q"],
  [0x52, "R"],
  [0x53, "S"],
  [0x54, "T"],
  [0x55, "U"],
  [0x56, "V"],
  [0x57, "W"],
  [0x58, "X"],
  [0x59, "Y"],
  [0x5a, "Z"],
  [0x5b, "["],
  [0x5c, "\\"],
  [0x5d, "]"],
  [0x5e, "^"],
  [0x5f, "_"],
  [0x60, "`"],
  [0x61, "a"],
  [0x62, "b"],
  [0x63, "c"],
  [0x64, "d"],
  [0x65, "e"],
  [0x66, "f"],
  [0x67, "g"],
  [0x68, "h"],
  [0x69, "i"],
  [0x6a, "j"],
  [0x6b, "k"],
  [0x6c, "l"],
  [0x6d, "m"],
  [0x6e, "n"],
  [0x6f, "o"],
  [0x70, "p"],
  [0x71, "q"],
  [0x72, "r"],
  [0x73, "s"],
  [0x74, "t"],
  [0x75, "u"],
  [0x76, "v"],
  [0x77, "w"],
  [0x78, "x"],
  [0x79, "y"],
  [0x7a, "z"],
  [0x7b, "{"],
  [0x7c, "|"],
  [0x7d, "}"],
  [0x7e, "~"],
  // 0x80-0xFF: Mac-specific characters
  [0x80, "\u00C4"], // Latin Capital Letter A with Diaeresis
  [0x81, "\u00C5"], // Latin Capital Letter A with Ring Above
  [0x82, "\u00C7"], // Latin Capital Letter C with Cedilla
  [0x83, "\u00C9"], // Latin Capital Letter E with Acute
  [0x84, "\u00D1"], // Latin Capital Letter N with Tilde
  [0x85, "\u00D6"], // Latin Capital Letter O with Diaeresis
  [0x86, "\u00DC"], // Latin Capital Letter U with Diaeresis
  [0x87, "\u00E1"], // Latin Small Letter A with Acute
  [0x88, "\u00E0"], // Latin Small Letter A with Grave
  [0x89, "\u00E2"], // Latin Small Letter A with Circumflex
  [0x8a, "\u00E4"], // Latin Small Letter A with Diaeresis
  [0x8b, "\u00E3"], // Latin Small Letter A with Tilde
  [0x8c, "\u00E5"], // Latin Small Letter A with Ring Above
  [0x8d, "\u00E7"], // Latin Small Letter C with Cedilla
  [0x8e, "\u00E9"], // Latin Small Letter E with Acute
  [0x8f, "\u00E8"], // Latin Small Letter E with Grave
  [0x90, "\u00EA"], // Latin Small Letter E with Circumflex
  [0x91, "\u00EB"], // Latin Small Letter E with Diaeresis
  [0x92, "\u00ED"], // Latin Small Letter I with Acute
  [0x93, "\u00EC"], // Latin Small Letter I with Grave
  [0x94, "\u00EE"], // Latin Small Letter I with Circumflex
  [0x95, "\u00EF"], // Latin Small Letter I with Diaeresis
  [0x96, "\u00F1"], // Latin Small Letter N with Tilde
  [0x97, "\u00F3"], // Latin Small Letter O with Acute
  [0x98, "\u00F2"], // Latin Small Letter O with Grave
  [0x99, "\u00F4"], // Latin Small Letter O with Circumflex
  [0x9a, "\u00F6"], // Latin Small Letter O with Diaeresis
  [0x9b, "\u00F5"], // Latin Small Letter O with Tilde
  [0x9c, "\u00FA"], // Latin Small Letter U with Acute
  [0x9d, "\u00F9"], // Latin Small Letter U with Grave
  [0x9e, "\u00FB"], // Latin Small Letter U with Circumflex
  [0x9f, "\u00FC"], // Latin Small Letter U with Diaeresis
  [0xa0, "\u2020"], // Dagger
  [0xa1, "\u00B0"], // Degree Sign
  [0xa2, "\u00A2"], // Cent Sign
  [0xa3, "\u00A3"], // Pound Sign
  [0xa4, "\u00A7"], // Section Sign
  [0xa5, "\u2022"], // Bullet
  [0xa6, "\u00B6"], // Pilcrow Sign
  [0xa7, "\u00DF"], // Latin Small Letter Sharp S
  [0xa8, "\u00AE"], // Registered Sign
  [0xa9, "\u00A9"], // Copyright Sign
  [0xaa, "\u2122"], // Trade Mark Sign
  [0xab, "\u00B4"], // Acute Accent
  [0xac, "\u00A8"], // Diaeresis
  [0xad, "\u2260"], // Not Equal To
  [0xae, "\u00C6"], // Latin Capital Letter AE
  [0xaf, "\u00D8"], // Latin Capital Letter O with Stroke
  [0xb0, "\u221E"], // Infinity
  [0xb1, "\u00B1"], // Plus-Minus Sign
  [0xb2, "\u2264"], // Less-Than or Equal To
  [0xb3, "\u2265"], // Greater-Than or Equal To
  [0xb4, "\u00A5"], // Yen Sign
  [0xb5, "\u00B5"], // Micro Sign
  [0xb6, "\u2202"], // Partial Differential
  [0xb7, "\u2211"], // N-Ary Summation
  [0xb8, "\u220F"], // N-Ary Product
  [0xb9, "\u03C0"], // Greek Small Letter Pi
  [0xba, "\u222B"], // Integral
  [0xbb, "\u00AA"], // Feminine Ordinal Indicator
  [0xbc, "\u00BA"], // Masculine Ordinal Indicator
  [0xbd, "\u03A9"], // Greek Capital Letter Omega
  [0xbe, "\u00E6"], // Latin Small Letter AE
  [0xbf, "\u00F8"], // Latin Small Letter O with Stroke
  [0xc0, "\u00BF"], // Inverted Question Mark
  [0xc1, "\u00A1"], // Inverted Exclamation Mark
  [0xc2, "\u00AC"], // Not Sign
  [0xc3, "\u221A"], // Square Root
  [0xc4, "\u0192"], // Latin Small Letter F with Hook
  [0xc5, "\u2248"], // Almost Equal To
  [0xc6, "\u2206"], // Increment
  [0xc7, "\u00AB"], // Left-Pointing Double Angle Quotation Mark
  [0xc8, "\u00BB"], // Right-Pointing Double Angle Quotation Mark
  [0xc9, "\u2026"], // Horizontal Ellipsis
  [0xca, "\u00A0"], // No-Break Space
  [0xcb, "\u00C0"], // Latin Capital Letter A with Grave
  [0xcc, "\u00C3"], // Latin Capital Letter A with Tilde
  [0xcd, "\u00D5"], // Latin Capital Letter O with Tilde
  [0xce, "\u0152"], // Latin Capital Ligature OE
  [0xcf, "\u0153"], // Latin Small Ligature OE
  [0xd0, "\u2013"], // En Dash
  [0xd1, "\u2014"], // Em Dash
  [0xd2, "\u201C"], // Left Double Quotation Mark
  [0xd3, "\u201D"], // Right Double Quotation Mark
  [0xd4, "\u2018"], // Left Single Quotation Mark
  [0xd5, "\u2019"], // Right Single Quotation Mark
  [0xd6, "\u00F7"], // Division Sign
  [0xd7, "\u25CA"], // Lozenge
  [0xd8, "\u00FF"], // Latin Small Letter Y with Diaeresis
  [0xd9, "\u0178"], // Latin Capital Letter Y with Diaeresis
  [0xda, "\u2044"], // Fraction Slash
  [0xdb, "\u20AC"], // Euro Sign
  [0xdc, "\u2039"], // Single Left-Pointing Angle Quotation Mark
  [0xdd, "\u203A"], // Single Right-Pointing Angle Quotation Mark
  [0xde, "\uFB01"], // Latin Small Ligature Fi
  [0xdf, "\uFB02"], // Latin Small Ligature Fl
  [0xe0, "\u2021"], // Double Dagger
  [0xe1, "\u00B7"], // Middle Dot
  [0xe2, "\u201A"], // Single Low-9 Quotation Mark
  [0xe3, "\u201E"], // Double Low-9 Quotation Mark
  [0xe4, "\u2030"], // Per Mille Sign
  [0xe5, "\u00C2"], // Latin Capital Letter A with Circumflex
  [0xe6, "\u00CA"], // Latin Capital Letter E with Circumflex
  [0xe7, "\u00C1"], // Latin Capital Letter A with Acute
  [0xe8, "\u00CB"], // Latin Capital Letter E with Diaeresis
  [0xe9, "\u00C8"], // Latin Capital Letter E with Grave
  [0xea, "\u00CD"], // Latin Capital Letter I with Acute
  [0xeb, "\u00CE"], // Latin Capital Letter I with Circumflex
  [0xec, "\u00CF"], // Latin Capital Letter I with Diaeresis
  [0xed, "\u00CC"], // Latin Capital Letter I with Grave
  [0xee, "\u00D3"], // Latin Capital Letter O with Acute
  [0xef, "\u00D4"], // Latin Capital Letter O with Circumflex
  [0xf0, "\uF8FF"], // Apple Logo (Private Use Area)
  [0xf1, "\u00D2"], // Latin Capital Letter O with Grave
  [0xf2, "\u00DA"], // Latin Capital Letter U with Acute
  [0xf3, "\u00DB"], // Latin Capital Letter U with Circumflex
  [0xf4, "\u00D9"], // Latin Capital Letter U with Grave
  [0xf5, "\u0131"], // Latin Small Letter Dotless I
  [0xf6, "\u02C6"], // Modifier Letter Circumflex Accent
  [0xf7, "\u02DC"], // Small Tilde
  [0xf8, "\u00AF"], // Macron
  [0xf9, "\u02D8"], // Breve
  [0xfa, "\u02D9"], // Dot Above
  [0xfb, "\u02DA"], // Ring Above
  [0xfc, "\u00B8"], // Cedilla
  [0xfd, "\u02DD"], // Double Acute Accent
  [0xfe, "\u02DB"], // Ogonek
  [0xff, "\u02C7"], // Caron
]);

/**
 * StandardEncoding (Adobe Standard Encoding)
 *
 * Default encoding for Type 1 fonts without explicit encoding.
 * ISO 32000-1, Annex D, Table D.3
 */
export const STANDARD_ENCODING: ReadonlyMap<number, string> = new Map<number, string>([
  // 0x20-0x7E: Standard ASCII printable characters (mostly same)
  [0x20, " "],
  [0x21, "!"],
  [0x22, '"'],
  [0x23, "#"],
  [0x24, "$"],
  [0x25, "%"],
  [0x26, "&"],
  [0x27, "\u2019"], // quoteright (different from ASCII)
  [0x28, "("],
  [0x29, ")"],
  [0x2a, "*"],
  [0x2b, "+"],
  [0x2c, ","],
  [0x2d, "-"],
  [0x2e, "."],
  [0x2f, "/"],
  [0x30, "0"],
  [0x31, "1"],
  [0x32, "2"],
  [0x33, "3"],
  [0x34, "4"],
  [0x35, "5"],
  [0x36, "6"],
  [0x37, "7"],
  [0x38, "8"],
  [0x39, "9"],
  [0x3a, ":"],
  [0x3b, ";"],
  [0x3c, "<"],
  [0x3d, "="],
  [0x3e, ">"],
  [0x3f, "?"],
  [0x40, "@"],
  [0x41, "A"],
  [0x42, "B"],
  [0x43, "C"],
  [0x44, "D"],
  [0x45, "E"],
  [0x46, "F"],
  [0x47, "G"],
  [0x48, "H"],
  [0x49, "I"],
  [0x4a, "J"],
  [0x4b, "K"],
  [0x4c, "L"],
  [0x4d, "M"],
  [0x4e, "N"],
  [0x4f, "O"],
  [0x50, "P"],
  [0x51, "Q"],
  [0x52, "R"],
  [0x53, "S"],
  [0x54, "T"],
  [0x55, "U"],
  [0x56, "V"],
  [0x57, "W"],
  [0x58, "X"],
  [0x59, "Y"],
  [0x5a, "Z"],
  [0x5b, "["],
  [0x5c, "\\"],
  [0x5d, "]"],
  [0x5e, "^"],
  [0x5f, "_"],
  [0x60, "\u2018"], // quoteleft (different from ASCII)
  [0x61, "a"],
  [0x62, "b"],
  [0x63, "c"],
  [0x64, "d"],
  [0x65, "e"],
  [0x66, "f"],
  [0x67, "g"],
  [0x68, "h"],
  [0x69, "i"],
  [0x6a, "j"],
  [0x6b, "k"],
  [0x6c, "l"],
  [0x6d, "m"],
  [0x6e, "n"],
  [0x6f, "o"],
  [0x70, "p"],
  [0x71, "q"],
  [0x72, "r"],
  [0x73, "s"],
  [0x74, "t"],
  [0x75, "u"],
  [0x76, "v"],
  [0x77, "w"],
  [0x78, "x"],
  [0x79, "y"],
  [0x7a, "z"],
  [0x7b, "{"],
  [0x7c, "|"],
  [0x7d, "}"],
  [0x7e, "~"],
  // 0x80-0xFF: StandardEncoding-specific
  // Note: Many positions are undefined in StandardEncoding
  [0xa1, "\u00A1"], // exclamdown
  [0xa2, "\u00A2"], // cent
  [0xa3, "\u00A3"], // sterling
  [0xa4, "\u2044"], // fraction
  [0xa5, "\u00A5"], // yen
  [0xa6, "\u0192"], // florin
  [0xa7, "\u00A7"], // section
  [0xa8, "\u00A4"], // currency
  [0xa9, "'"],      // quotesingle
  [0xaa, "\u201C"], // quotedblleft
  [0xab, "\u00AB"], // guillemotleft
  [0xac, "\u2039"], // guilsinglleft
  [0xad, "\u203A"], // guilsinglright
  [0xae, "\uFB01"], // fi
  [0xaf, "\uFB02"], // fl
  [0xb1, "\u2013"], // endash
  [0xb2, "\u2020"], // dagger
  [0xb3, "\u2021"], // daggerdbl
  [0xb4, "\u00B7"], // periodcentered
  [0xb6, "\u00B6"], // paragraph
  [0xb7, "\u2022"], // bullet
  [0xb8, "\u201A"], // quotesinglbase
  [0xb9, "\u201E"], // quotedblbase
  [0xba, "\u201D"], // quotedblright
  [0xbb, "\u00BB"], // guillemotright
  [0xbc, "\u2026"], // ellipsis
  [0xbd, "\u2030"], // perthousand
  [0xbf, "\u00BF"], // questiondown
  [0xc1, "\u0060"], // grave
  [0xc2, "\u00B4"], // acute
  [0xc3, "\u02C6"], // circumflex
  [0xc4, "\u02DC"], // tilde
  [0xc5, "\u00AF"], // macron
  [0xc6, "\u02D8"], // breve
  [0xc7, "\u02D9"], // dotaccent
  [0xc8, "\u00A8"], // dieresis
  [0xca, "\u02DA"], // ring
  [0xcb, "\u00B8"], // cedilla
  [0xcc, "\u02DD"], // hungarumlaut
  [0xcd, "\u02DB"], // ogonek
  [0xce, "\u02C7"], // caron
  [0xcf, "\u2014"], // emdash
  [0xe1, "\u00C6"], // AE
  [0xe3, "\u00AA"], // ordfeminine
  [0xe8, "\u0141"], // Lslash
  [0xe9, "\u00D8"], // Oslash
  [0xea, "\u0152"], // OE
  [0xeb, "\u00BA"], // ordmasculine
  [0xf1, "\u00E6"], // ae
  [0xf5, "\u0131"], // dotlessi
  [0xf8, "\u0142"], // lslash
  [0xf9, "\u00F8"], // oslash
  [0xfa, "\u0153"], // oe
  [0xfb, "\u00DF"], // germandbls
]);

/**
 * PDF Encoding type identifier
 */
export type PdfEncodingName = "WinAnsiEncoding" | "MacRomanEncoding" | "StandardEncoding";

/**
 * Get an encoding map by name.
 *
 * @param name - The encoding name (with or without leading slash)
 * @returns The encoding map, or undefined if not recognized
 */
export function getEncodingByName(name: string): ReadonlyMap<number, string> | undefined {
  // Remove leading slash if present
  const cleanName = name.startsWith("/") ? name.slice(1) : name;

  switch (cleanName) {
    case "WinAnsiEncoding":
      return WINANSI_ENCODING;
    case "MacRomanEncoding":
      return MACROMAN_ENCODING;
    case "StandardEncoding":
      return STANDARD_ENCODING;
    default:
      return undefined;
  }
}

/**
 * Apply Differences array to a base encoding map.
 *
 * The Differences array in PDF encoding dictionaries allows customization
 * of character mappings. Format: [code name1 name2 ... code name ...]
 *
 * @param baseEncoding - The base encoding map to modify
 * @param differences - The Differences array entries
 * @returns A new map with the differences applied
 */
export function applyEncodingDifferences(
  baseEncoding: ReadonlyMap<number, string>,
  differences: readonly (number | string)[]
): Map<number, string> {
  const result = new Map(baseEncoding);
  const currentCode = { value: 0 };

  for (const entry of differences) {
    if (typeof entry === "number") {
      currentCode.value = entry;
    } else {
      // Convert glyph name to Unicode
      const unicode = glyphNameToUnicode(entry);
      if (unicode !== undefined) {
        result.set(currentCode.value, unicode);
      }
      currentCode.value += 1;
    }
  }

  return result;
}

/**
 * Convert Adobe glyph name to Unicode string.
 *
 * Supports common glyph names used in PDF fonts.
 * This is a subset of the Adobe Glyph List.
 *
 * @param name - The glyph name (with or without leading slash)
 * @returns The Unicode string, or undefined if not recognized
 */
export function glyphNameToUnicode(name: string): string | undefined {
  // Remove leading slash if present
  const cleanName = name.startsWith("/") ? name.slice(1) : name;

  // Check the glyph name table
  return GLYPH_NAME_TO_UNICODE.get(cleanName);
}

/**
 * Common Adobe glyph names to Unicode mappings.
 *
 * This is a subset of the Adobe Glyph List for New Fonts (AGLFN).
 * Only includes commonly used glyph names found in PDF fonts.
 */
const GLYPH_NAME_TO_UNICODE: ReadonlyMap<string, string> = new Map<string, string>([
  // Basic Latin
  ["space", " "],
  ["exclam", "!"],
  ["quotedbl", '"'],
  ["numbersign", "#"],
  ["dollar", "$"],
  ["percent", "%"],
  ["ampersand", "&"],
  ["quotesingle", "'"],
  ["parenleft", "("],
  ["parenright", ")"],
  ["asterisk", "*"],
  ["plus", "+"],
  ["comma", ","],
  ["hyphen", "-"],
  ["period", "."],
  ["slash", "/"],
  ["zero", "0"],
  ["one", "1"],
  ["two", "2"],
  ["three", "3"],
  ["four", "4"],
  ["five", "5"],
  ["six", "6"],
  ["seven", "7"],
  ["eight", "8"],
  ["nine", "9"],
  ["colon", ":"],
  ["semicolon", ";"],
  ["less", "<"],
  ["equal", "="],
  ["greater", ">"],
  ["question", "?"],
  ["at", "@"],
  ["A", "A"],
  ["B", "B"],
  ["C", "C"],
  ["D", "D"],
  ["E", "E"],
  ["F", "F"],
  ["G", "G"],
  ["H", "H"],
  ["I", "I"],
  ["J", "J"],
  ["K", "K"],
  ["L", "L"],
  ["M", "M"],
  ["N", "N"],
  ["O", "O"],
  ["P", "P"],
  ["Q", "Q"],
  ["R", "R"],
  ["S", "S"],
  ["T", "T"],
  ["U", "U"],
  ["V", "V"],
  ["W", "W"],
  ["X", "X"],
  ["Y", "Y"],
  ["Z", "Z"],
  ["bracketleft", "["],
  ["backslash", "\\"],
  ["bracketright", "]"],
  ["asciicircum", "^"],
  ["underscore", "_"],
  ["grave", "`"],
  ["a", "a"],
  ["b", "b"],
  ["c", "c"],
  ["d", "d"],
  ["e", "e"],
  ["f", "f"],
  ["g", "g"],
  ["h", "h"],
  ["i", "i"],
  ["j", "j"],
  ["k", "k"],
  ["l", "l"],
  ["m", "m"],
  ["n", "n"],
  ["o", "o"],
  ["p", "p"],
  ["q", "q"],
  ["r", "r"],
  ["s", "s"],
  ["t", "t"],
  ["u", "u"],
  ["v", "v"],
  ["w", "w"],
  ["x", "x"],
  ["y", "y"],
  ["z", "z"],
  ["braceleft", "{"],
  ["bar", "|"],
  ["braceright", "}"],
  ["asciitilde", "~"],
  // Latin Extended
  ["Agrave", "\u00C0"],
  ["Aacute", "\u00C1"],
  ["Acircumflex", "\u00C2"],
  ["Atilde", "\u00C3"],
  ["Adieresis", "\u00C4"],
  ["Aring", "\u00C5"],
  ["AE", "\u00C6"],
  ["Ccedilla", "\u00C7"],
  ["Egrave", "\u00C8"],
  ["Eacute", "\u00C9"],
  ["Ecircumflex", "\u00CA"],
  ["Edieresis", "\u00CB"],
  ["Igrave", "\u00CC"],
  ["Iacute", "\u00CD"],
  ["Icircumflex", "\u00CE"],
  ["Idieresis", "\u00CF"],
  ["Eth", "\u00D0"],
  ["Ntilde", "\u00D1"],
  ["Ograve", "\u00D2"],
  ["Oacute", "\u00D3"],
  ["Ocircumflex", "\u00D4"],
  ["Otilde", "\u00D5"],
  ["Odieresis", "\u00D6"],
  ["multiply", "\u00D7"],
  ["Oslash", "\u00D8"],
  ["Ugrave", "\u00D9"],
  ["Uacute", "\u00DA"],
  ["Ucircumflex", "\u00DB"],
  ["Udieresis", "\u00DC"],
  ["Yacute", "\u00DD"],
  ["Thorn", "\u00DE"],
  ["germandbls", "\u00DF"],
  ["agrave", "\u00E0"],
  ["aacute", "\u00E1"],
  ["acircumflex", "\u00E2"],
  ["atilde", "\u00E3"],
  ["adieresis", "\u00E4"],
  ["aring", "\u00E5"],
  ["ae", "\u00E6"],
  ["ccedilla", "\u00E7"],
  ["egrave", "\u00E8"],
  ["eacute", "\u00E9"],
  ["ecircumflex", "\u00EA"],
  ["edieresis", "\u00EB"],
  ["igrave", "\u00EC"],
  ["iacute", "\u00ED"],
  ["icircumflex", "\u00EE"],
  ["idieresis", "\u00EF"],
  ["eth", "\u00F0"],
  ["ntilde", "\u00F1"],
  ["ograve", "\u00F2"],
  ["oacute", "\u00F3"],
  ["ocircumflex", "\u00F4"],
  ["otilde", "\u00F5"],
  ["odieresis", "\u00F6"],
  ["divide", "\u00F7"],
  ["oslash", "\u00F8"],
  ["ugrave", "\u00F9"],
  ["uacute", "\u00FA"],
  ["ucircumflex", "\u00FB"],
  ["udieresis", "\u00FC"],
  ["yacute", "\u00FD"],
  ["thorn", "\u00FE"],
  ["ydieresis", "\u00FF"],
  // Special characters
  ["bullet", "\u2022"],
  ["ellipsis", "\u2026"],
  ["emdash", "\u2014"],
  ["endash", "\u2013"],
  ["fi", "\uFB01"],
  ["fl", "\uFB02"],
  ["quoteleft", "\u2018"],
  ["quoteright", "\u2019"],
  ["quotedblleft", "\u201C"],
  ["quotedblright", "\u201D"],
  ["quotesinglbase", "\u201A"],
  ["quotedblbase", "\u201E"],
  ["dagger", "\u2020"],
  ["daggerdbl", "\u2021"],
  ["perthousand", "\u2030"],
  ["trademark", "\u2122"],
  ["copyright", "\u00A9"],
  ["registered", "\u00AE"],
  ["Euro", "\u20AC"],
  ["florin", "\u0192"],
  ["fraction", "\u2044"],
  ["guillemotleft", "\u00AB"],
  ["guillemotright", "\u00BB"],
  ["guilsinglleft", "\u2039"],
  ["guilsinglright", "\u203A"],
  ["OE", "\u0152"],
  ["oe", "\u0153"],
  ["Scaron", "\u0160"],
  ["scaron", "\u0161"],
  ["Zcaron", "\u017D"],
  ["zcaron", "\u017E"],
  ["Ydieresis", "\u0178"],
  ["dotlessi", "\u0131"],
  ["Lslash", "\u0141"],
  ["lslash", "\u0142"],
  // Symbols
  ["degree", "\u00B0"],
  ["cent", "\u00A2"],
  ["sterling", "\u00A3"],
  ["yen", "\u00A5"],
  ["currency", "\u00A4"],
  ["section", "\u00A7"],
  ["paragraph", "\u00B6"],
  ["plusminus", "\u00B1"],
  ["logicalnot", "\u00AC"],
  ["mu", "\u00B5"],
  ["periodcentered", "\u00B7"],
  ["exclamdown", "\u00A1"],
  ["questiondown", "\u00BF"],
  ["ordfeminine", "\u00AA"],
  ["ordmasculine", "\u00BA"],
  ["onequarter", "\u00BC"],
  ["onehalf", "\u00BD"],
  ["threequarters", "\u00BE"],
  ["onesuperior", "\u00B9"],
  ["twosuperior", "\u00B2"],
  ["threesuperior", "\u00B3"],
  // Accents
  ["acute", "\u00B4"],
  ["dieresis", "\u00A8"],
  ["macron", "\u00AF"],
  ["cedilla", "\u00B8"],
  ["circumflex", "\u02C6"],
  ["tilde", "\u02DC"],
  ["breve", "\u02D8"],
  ["dotaccent", "\u02D9"],
  ["ring", "\u02DA"],
  ["hungarumlaut", "\u02DD"],
  ["ogonek", "\u02DB"],
  ["caron", "\u02C7"],
  // Mathematical
  ["minus", "\u2212"],
  ["infinity", "\u221E"],
  ["lessequal", "\u2264"],
  ["greaterequal", "\u2265"],
  ["notequal", "\u2260"],
  ["approxequal", "\u2248"],
  ["partialdiff", "\u2202"],
  ["summation", "\u2211"],
  ["product", "\u220F"],
  ["radical", "\u221A"],
  ["integral", "\u222B"],
  ["lozenge", "\u25CA"],
  // Greek
  ["Delta", "\u0394"],
  ["Omega", "\u03A9"],
  ["pi", "\u03C0"],
  // Non-breaking space
  ["nbspace", "\u00A0"],
  ["nonbreakingspace", "\u00A0"],
]);
