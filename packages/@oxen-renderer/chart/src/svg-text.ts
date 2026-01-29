import type { ResolvedTextStyle } from "./types";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function toSvgTextAttributes(style: ResolvedTextStyle): string {
  const parts: string[] = [];

  parts.push(`font-size="${style.fontSize}"`);
  parts.push(`font-family="${escapeAttr(style.fontFamily)}"`);

  if (style.fontWeight && style.fontWeight !== "normal") {
    parts.push(`font-weight="${escapeAttr(style.fontWeight)}"`);
  }

  return parts.join(" ");
}
