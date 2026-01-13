/**
 * @file Font name mapping
 *
 * PDF font name to standard font name mapping.
 * PDF Reference Appendix H defines the standard 14 fonts.
 */

/**
 * PDF standard 14 fonts mapping to common system fonts
 * Also includes common embedded font names and CID fonts
 *
 * CID fonts are based on Adobe character collections:
 * - Adobe-Japan1: Japanese (JIS X 0208, JIS X 0212)
 * - Adobe-GB1: Simplified Chinese (GB 2312, GBK, GB 18030)
 * - Adobe-CNS1: Traditional Chinese (Big5, CNS 11643)
 * - Adobe-Korea1: Korean (KS X 1001)
 */
const FONT_NAME_MAP: Record<string, string> = {
  // Helvetica family → Arial (PDF standard 14)
  Helvetica: "Arial",
  "Helvetica-Bold": "Arial",
  "Helvetica-Oblique": "Arial",
  "Helvetica-BoldOblique": "Arial",
  // Times family → Times New Roman (PDF standard 14)
  "Times-Roman": "Times New Roman",
  "Times-Bold": "Times New Roman",
  "Times-Italic": "Times New Roman",
  "Times-BoldItalic": "Times New Roman",
  // Courier family → Courier New (PDF standard 14)
  Courier: "Courier New",
  "Courier-Bold": "Courier New",
  "Courier-Oblique": "Courier New",
  "Courier-BoldOblique": "Courier New",
  // Symbol fonts (PDF standard 14)
  Symbol: "Symbol",
  ZapfDingbats: "Wingdings",
  // Common embedded font names
  ArialMT: "Arial",
  "Arial-BoldMT": "Arial",
  "Arial-ItalicMT": "Arial",
  "Arial-BoldItalicMT": "Arial",
  TimesNewRomanPSMT: "Times New Roman",
  "TimesNewRomanPS-BoldMT": "Times New Roman",
  "TimesNewRomanPS-ItalicMT": "Times New Roman",
  "TimesNewRomanPS-BoldItalicMT": "Times New Roman",
  CourierNewPSMT: "Courier New",
  "CourierNewPS-BoldMT": "Courier New",
  "CourierNewPS-ItalicMT": "Courier New",
  "CourierNewPS-BoldItalicMT": "Courier New",

  // =========================================================================
  // Adobe-Japan1 (Japanese) CID Fonts
  // =========================================================================
  // Mincho family (serif)
  "MS-Mincho": "MS Mincho",
  MSMincho: "MS Mincho",
  "MS-PMincho": "MS PMincho",
  MSPMincho: "MS PMincho",
  "Kozuka-Mincho": "Yu Mincho",
  KozukaMincho: "Yu Mincho",
  "KozukaMincho-Pro": "Yu Mincho",
  "HeiseiMin-W3": "MS Mincho",
  "Ryumin-Light": "MS Mincho",
  "HiraMinPro-W3": "Hiragino Mincho Pro",
  "HiraMinProN-W3": "Hiragino Mincho ProN",
  // Gothic family (sans-serif)
  "MS-Gothic": "MS Gothic",
  MSGothic: "MS Gothic",
  "MS-PGothic": "MS PGothic",
  MSPGothic: "MS PGothic",
  "Kozuka-Gothic": "Yu Gothic",
  KozukaGothic: "Yu Gothic",
  "KozukaGothic-Pro": "Yu Gothic",
  "HeiseiKakuGo-W5": "MS Gothic",
  "GothicBBB-Medium": "MS Gothic",
  "HiraKakuPro-W3": "Hiragino Kaku Gothic Pro",
  "HiraKakuProN-W3": "Hiragino Kaku Gothic ProN",
  "HiraKakuPro-W6": "Hiragino Kaku Gothic Pro",
  "HiraKakuProN-W6": "Hiragino Kaku Gothic ProN",
  // Maru Gothic (rounded sans-serif)
  "HiraMaruPro-W4": "Hiragino Maru Gothic Pro",
  "HiraMaruProN-W4": "Hiragino Maru Gothic ProN",

  // =========================================================================
  // Adobe-GB1 (Simplified Chinese) CID Fonts
  // =========================================================================
  SimSun: "SimSun",
  "SimSun-18030": "SimSun",
  NSimSun: "NSimSun",
  SimHei: "SimHei",
  FangSong: "FangSong",
  KaiTi: "KaiTi",
  "STSong-Light": "SimSun",
  STSong: "SimSun",
  "STHeiti-Regular": "SimHei",
  STHeiti: "SimHei",
  "STFangsong-Light": "FangSong",
  STFangsong: "FangSong",
  "STKaiti-Regular": "KaiTi",
  STKaiti: "KaiTi",
  "Adobe-Song-Std": "SimSun",
  "AdobeSongStd-Light": "SimSun",
  "Adobe-Heiti-Std": "SimHei",
  "AdobeHeitiStd-Regular": "SimHei",
  // PingFang (macOS/iOS)
  "PingFangSC-Regular": "PingFang SC",
  "PingFangSC-Medium": "PingFang SC",
  "PingFangSC-Semibold": "PingFang SC",
  "PingFangSC-Light": "PingFang SC",

  // =========================================================================
  // Adobe-CNS1 (Traditional Chinese) CID Fonts
  // =========================================================================
  MingLiU: "MingLiU",
  PMingLiU: "PMingLiU",
  "MingLiU-ExtB": "MingLiU",
  "PMingLiU-ExtB": "PMingLiU",
  "MSung-Light": "MingLiU",
  MSung: "MingLiU",
  "MHei-Medium": "Microsoft JhengHei",
  MHei: "Microsoft JhengHei",
  "Adobe-Ming-Std": "MingLiU",
  "AdobeMingStd-Light": "MingLiU",
  // PingFang (macOS/iOS)
  "PingFangTC-Regular": "PingFang TC",
  "PingFangTC-Medium": "PingFang TC",
  "PingFangTC-Semibold": "PingFang TC",
  "PingFangTC-Light": "PingFang TC",
  // Hiragino (macOS)
  "HiraginoSans-W3": "Hiragino Sans",
  "HiraginoSansGB-W3": "Hiragino Sans GB",

  // =========================================================================
  // Adobe-Korea1 (Korean) CID Fonts
  // =========================================================================
  Batang: "Batang",
  BatangChe: "BatangChe",
  Dotum: "Dotum",
  DotumChe: "DotumChe",
  Gulim: "Gulim",
  GulimChe: "GulimChe",
  Gungsuh: "Gungsuh",
  GungsuhChe: "GungsuhChe",
  "HYGoThic-Medium": "Gulim",
  HYGoThic: "Gulim",
  "HYSMyeongJo-Medium": "Batang",
  HYSMyeongJo: "Batang",
  "HYGothic-Extra": "Gulim",
  "Adobe-Myungjo-Std": "Batang",
  "AdobeMyungjoStd-Medium": "Batang",
  "Adobe-Gothic-Std": "Gulim",
  "AdobeGothicStd-Bold": "Gulim",
  // Malgun Gothic (Windows Vista+)
  "Malgun-Gothic": "Malgun Gothic",
  MalgunGothic: "Malgun Gothic",
  // Apple Gothic (macOS)
  "AppleGothic-Regular": "Apple SD Gothic Neo",
  AppleGothic: "Apple SD Gothic Neo",
};

/**
 * Normalize PDF font name to a clean font-family name.
 *
 * This is the single source of truth for font name normalization.
 * Used by both @font-face generation (font-extractor) and text rendering.
 *
 * Steps:
 * 1. Remove leading slash (e.g., "/Helvetica" → "Helvetica")
 * 2. Remove subset prefix (e.g., "ABCDEF+Helvetica" → "Helvetica")
 * 3. Replace hyphens with spaces (e.g., "Hiragino-Sans" → "Hiragino Sans")
 *
 * @param pdfFontName - Raw font name from PDF (BaseFont or resource identifier)
 * @returns Normalized font-family name
 */
export function normalizeFontFamily(pdfFontName: string): string {
  // Remove leading slash if present
  let name = pdfFontName.startsWith("/") ? pdfFontName.slice(1) : pdfFontName;

  // Remove subset/synthetic prefix (e.g., "ABCDEF+", "CIDFont+")
  const plusIndex = name.indexOf("+");
  if (plusIndex > 0) {
    name = name.slice(plusIndex + 1);
  }

  // Replace hyphens with spaces for common patterns
  // e.g., "Hiragino-Sans" -> "Hiragino Sans"
  name = name.replace(/-/g, " ");

  return name;
}

/**
 * Map PDF font name to standard system font name.
 *
 * For non-embedded fonts, maps PDF font names to available system fonts.
 * For embedded fonts, use normalizeFontFamily() directly instead.
 *
 * @param pdfFontName - Raw font name from PDF
 * @returns Standard system font name
 */
export function mapFontName(pdfFontName: string): string {
  // Normalize first
  const name = normalizeFontFamily(pdfFontName);

  // Check direct mapping
  const mapped = FONT_NAME_MAP[name];
  if (mapped) {
    return mapped;
  }

  // Check for common patterns in embedded font names
  const lowerName = name.toLowerCase();
  if (lowerName.includes("arial") || lowerName.includes("helvetica")) {
    return "Arial";
  }
  if (lowerName.includes("times")) {
    return "Times New Roman";
  }
  if (lowerName.includes("courier")) {
    return "Courier New";
  }

  // Check for CJK font patterns
  if (lowerName.includes("mincho") || lowerName.includes("ming")) {
    // Serif CJK font
    if (lowerName.includes("sc") || lowerName.includes("simp")) {
      return "SimSun";
    }
    if (lowerName.includes("tc") || lowerName.includes("trad")) {
      return "MingLiU";
    }
    return "MS Mincho"; // Default to Japanese
  }
  if (lowerName.includes("gothic") || lowerName.includes("hei")) {
    // Sans-serif CJK font
    if (lowerName.includes("sc") || lowerName.includes("simp")) {
      return "SimHei";
    }
    if (lowerName.includes("tc") || lowerName.includes("trad")) {
      return "Microsoft JhengHei";
    }
    return "MS Gothic"; // Default to Japanese
  }
  if (lowerName.includes("song") || lowerName.includes("sun")) {
    return "SimSun";
  }
  if (lowerName.includes("batang") || lowerName.includes("myungjo")) {
    return "Batang";
  }
  if (lowerName.includes("gulim") || lowerName.includes("dotum")) {
    return "Gulim";
  }

  // Hiragino fonts (macOS)
  if (lowerName.includes("hiragino")) {
    if (lowerName.includes("mincho")) {
      return "Hiragino Mincho ProN";
    }
    if (lowerName.includes("maru")) {
      return "Hiragino Maru Gothic ProN";
    }
    if (lowerName.includes("gb")) {
      return "Hiragino Sans GB";
    }
    // Default to Hiragino Sans (Kaku Gothic replacement)
    return "Hiragino Sans";
  }

  // PingFang fonts (macOS/iOS)
  if (lowerName.includes("pingfang")) {
    if (lowerName.includes("tc") || lowerName.includes("hk")) {
      return "PingFang TC";
    }
    return "PingFang SC";
  }

  // Return as-is if no mapping found
  return name;
}

