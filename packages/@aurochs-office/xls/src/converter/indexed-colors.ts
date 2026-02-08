/**
 * @file XLS PALETTE → XLSX indexedColors mapping
 */

const DEFAULT_INDEXED_COLORS_ARGB: readonly string[] = [
  "FF000000", // 0
  "FFFFFFFF", // 1
  "FFFF0000", // 2
  "FF00FF00", // 3
  "FF0000FF", // 4
  "FFFFFF00", // 5
  "FFFF00FF", // 6
  "FF00FFFF", // 7
  "FF000000", // 8
  "FFFFFFFF", // 9
  "FFFF0000", // 10
  "FF00FF00", // 11
  "FF0000FF", // 12
  "FFFFFF00", // 13
  "FFFF00FF", // 14
  "FF00FFFF", // 15
  "FF800000", // 16
  "FF008000", // 17
  "FF000080", // 18
  "FF808000", // 19
  "FF800080", // 20
  "FF008080", // 21
  "FFC0C0C0", // 22
  "FF808080", // 23
  "FF9999FF", // 24
  "FF993366", // 25
  "FFFFFFCC", // 26
  "FFCCFFFF", // 27
  "FF660066", // 28
  "FFFF8080", // 29
  "FF0066CC", // 30
  "FFCCCCFF", // 31
  "FF000080", // 32
  "FFFF00FF", // 33
  "FFFFFF00", // 34
  "FF00FFFF", // 35
  "FF800080", // 36
  "FF800000", // 37
  "FF008080", // 38
  "FF0000FF", // 39
  "FF00CCFF", // 40
  "FFCCFFFF", // 41
  "FFCCFFCC", // 42
  "FFFFFF99", // 43
  "FF99CCFF", // 44
  "FFFF99CC", // 45
  "FFCC99FF", // 46
  "FFFFCC99", // 47
  "FF3366FF", // 48
  "FF33CCCC", // 49
  "FF99CC00", // 50
  "FFFFCC00", // 51
  "FFFF9900", // 52
  "FFFF6600", // 53
  "FF666699", // 54
  "FF969696", // 55
  "FF003366", // 56
  "FF339966", // 57
  "FF003300", // 58
  "FF333300", // 59
  "FF993300", // 60
  "FF993366", // 61
  "FF333399", // 62
  "FF333333", // 63
];

function isArgbHex8(value: string): boolean {
  return /^[0-9A-Fa-f]{8}$/.test(value);
}

/**
 * Build XLSX `styleSheet/colors/indexedColors` from an XLS PALETTE record.
 *
 * The XLS BIFF8 PALETTE record provides N RGB colors (typically 56) that map to indexed slots 8..63.
 */
export function buildXlsxIndexedColorsFromXlsPalette(paletteColors: readonly string[]): readonly string[] {
  if (!paletteColors) {
    throw new Error("buildXlsxIndexedColorsFromXlsPalette: paletteColors must be provided");
  }

  const maxPaletteColors = 64 - 8;
  if (paletteColors.length > maxPaletteColors) {
    throw new Error(`buildXlsxIndexedColorsFromXlsPalette: too many palette colors: ${paletteColors.length} (max ${maxPaletteColors})`);
  }

  const indexed = [...DEFAULT_INDEXED_COLORS_ARGB];
  for (let i = 0; i < paletteColors.length; i++) {
    const color = paletteColors[i];
    if (!color || !isArgbHex8(color)) {
      throw new Error(`buildXlsxIndexedColorsFromXlsPalette: invalid ARGB at index ${i}: ${String(color)}`);
    }
    indexed[8 + i] = color.toUpperCase();
  }

  return indexed;
}

