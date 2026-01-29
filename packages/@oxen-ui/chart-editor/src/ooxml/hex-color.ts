/**
 * @file Hex color helpers
 */

import type { Color } from "@oxen-office/ooxml/domain/color";

export function createSrgbColor(hex6: string): Color {
  const normalized = normalizeHex6(hex6);
  return {
    spec: {
      type: "srgb",
      value: normalized,
    },
  };
}

export function normalizeHex6(value: string): string {
  const raw = value.trim().replace(/^#/, "").toUpperCase();
  if (isValidHex6(raw)) {
    return raw;
  }
  return "000000";
}

function isValidHex6(value: string): boolean {
  return /^[0-9A-F]{6}$/.test(value);
}

