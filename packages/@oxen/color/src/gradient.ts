/**
 * @file Gradient parsing utilities
 * Parse CSS gradients and convert to SVG gradient definitions
 */

/**
 * Parsed linear gradient data
 */
export type ParsedLinearGradient = {
  angle: number;
  colors: string[];
};

/**
 * SVG gradient definition result
 */
export type SvgGradientResult = {
  defs: string;
  fillUrl: string;
};

/**
 * Parse a CSS linear-gradient string
 * @param gradientCss - CSS gradient string like "linear-gradient(90deg, #fff, #000)"
 * @returns Parsed gradient data or undefined if parsing fails
 */
export function parseLinearGradient(gradientCss: string): ParsedLinearGradient | undefined {
  const match = gradientCss.match(/linear-gradient\(\s*(\d+)deg\s*,\s*(.+)\)/i);
  if (match === null) {
    return undefined;
  }

  const angle = parseInt(match[1], 10);
  const colorsStr = match[2];

  // Parse colors - matches #hex, #shorthex, and rgba()
  const colorMatches = colorsStr.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgba?\([^)]+\)/g);
  if (colorMatches === null || colorMatches.length < 2) {
    return undefined;
  }

  return {
    angle,
    colors: colorMatches,
  };
}

/**
 * Convert an angle to SVG gradient coordinates (x1, y1, x2, y2)
 * All values are percentages (0-100)
 */
export function angleToGradientCoords(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x1: 50 - 50 * Math.cos(rad),
    y1: 50 + 50 * Math.sin(rad),
    x2: 50 + 50 * Math.cos(rad),
    y2: 50 - 50 * Math.sin(rad),
  };
}

/**
 * Convert parsed gradient to SVG gradient definition
 * @param gradient - Parsed gradient data
 * @param id - ID for the gradient element
 * @returns SVG defs string and fill URL
 */
export function toSvgLinearGradient(gradient: ParsedLinearGradient, id: string): SvgGradientResult {
  const coords = angleToGradientCoords(gradient.angle);

  const stops = gradient.colors.map((color, i) => {
    const offset = (i / (gradient.colors.length - 1)) * 100;
    return `<stop offset="${offset}%" stop-color="${color}"/>`;
  }).join("");

  const defs = `<defs><linearGradient id="${id}" x1="${coords.x1}%" y1="${coords.y1}%" x2="${coords.x2}%" y2="${coords.y2}%">${stops}</linearGradient></defs>`;

  return { defs, fillUrl: `url(#${id})` };
}

/**
 * Parse CSS gradient and convert to SVG gradient in one step
 * @param gradientCss - CSS gradient string
 * @param id - ID for the gradient element
 * @returns SVG gradient result or undefined if parsing fails
 */
export function cssGradientToSvg(gradientCss: string, id: string): SvgGradientResult | undefined {
  const parsed = parseLinearGradient(gradientCss);
  if (parsed === undefined) {
    return undefined;
  }
  return toSvgLinearGradient(parsed, id);
}

/**
 * Extract the first color from a CSS gradient string
 * Useful as a fallback when gradient parsing fails
 */
export function extractFirstColor(gradientCss: string): string | undefined {
  const colorMatch = gradientCss.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}/);
  return colorMatch?.[0];
}
