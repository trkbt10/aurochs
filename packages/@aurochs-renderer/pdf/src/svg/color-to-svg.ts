import type { PdfColor } from "@aurochs/pdf/domain";
import { clamp01, cmykToRgb, grayToRgb, rgbToHex, rgbToRgbBytes } from "@aurochs/pdf/domain/color";

export type SvgPaint = Readonly<{
  readonly color: string;
  readonly opacity: number;
}>;

function colorToHex(color: PdfColor): string {
  switch (color.colorSpace) {
    case "DeviceGray": {
      const [gray = 0] = color.components;
      const [r, g, b] = grayToRgb(gray);
      return `#${rgbToHex(r, g, b)}`;
    }
    case "DeviceRGB": {
      const [r = 0, g = 0, b = 0] = color.components;
      const rgb = rgbToRgbBytes(r, g, b);
      return `#${rgbToHex(rgb[0], rgb[1], rgb[2])}`;
    }
    case "DeviceCMYK": {
      const [c = 0, m = 0, y = 0, k = 0] = color.components;
      const rgb = cmykToRgb({ c, m, y, k });
      return `#${rgbToHex(rgb[0], rgb[1], rgb[2])}`;
    }
    case "ICCBased": {
      if (color.alternateColorSpace === "DeviceGray") {
        const [gray = 0] = color.components;
        const [r, g, b] = grayToRgb(gray);
        return `#${rgbToHex(r, g, b)}`;
      }
      if (color.alternateColorSpace === "DeviceCMYK") {
        const [c = 0, m = 0, y = 0, k = 0] = color.components;
        const rgb = cmykToRgb({ c, m, y, k });
        return `#${rgbToHex(rgb[0], rgb[1], rgb[2])}`;
      }
      const [r = 0, g = 0, b = 0] = color.components;
      const rgb = rgbToRgbBytes(r, g, b);
      return `#${rgbToHex(rgb[0], rgb[1], rgb[2])}`;
    }
    case "Pattern":
      return "#000000";
    default:
      return "#000000";
  }
}

export function toSvgPaint(color: PdfColor, alpha: number): SvgPaint {
  return {
    color: colorToHex(color),
    opacity: clamp01(alpha),
  };
}
