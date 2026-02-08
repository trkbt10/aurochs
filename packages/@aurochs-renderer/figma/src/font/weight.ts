/**
 * @file Font weight detection from style strings
 */

/**
 * Standard CSS font weight values
 */
export const FONT_WEIGHTS = {
  THIN: 100,
  EXTRA_LIGHT: 200,
  LIGHT: 300,
  REGULAR: 400,
  MEDIUM: 500,
  SEMI_BOLD: 600,
  BOLD: 700,
  EXTRA_BOLD: 800,
  BLACK: 900,
} as const;

export type FontWeight = (typeof FONT_WEIGHTS)[keyof typeof FONT_WEIGHTS];

/**
 * Weight detection rule
 */
type WeightRule = {
  readonly patterns: readonly string[];
  readonly weight: FontWeight;
  /** Exclude patterns (e.g., "bold" but not "extrabold") */
  readonly excludePatterns?: readonly string[];
};

/**
 * Font weight detection rules
 *
 * Order matters: more specific patterns should come first
 */
const WEIGHT_RULES: readonly WeightRule[] = [
  { patterns: ["thin", "hairline"], weight: FONT_WEIGHTS.THIN },
  {
    patterns: ["extralight", "extra light", "ultralight", "ultra light"],
    weight: FONT_WEIGHTS.EXTRA_LIGHT,
  },
  {
    patterns: ["light"],
    weight: FONT_WEIGHTS.LIGHT,
    excludePatterns: ["extralight", "extra light", "ultralight", "ultra light"],
  },
  { patterns: ["regular", "normal", "book", "roman"], weight: FONT_WEIGHTS.REGULAR },
  { patterns: ["medium"], weight: FONT_WEIGHTS.MEDIUM },
  {
    patterns: ["semibold", "semi bold", "demibold", "demi bold", "demi"],
    weight: FONT_WEIGHTS.SEMI_BOLD,
  },
  {
    patterns: ["extrabold", "extra bold", "ultrabold", "ultra bold"],
    weight: FONT_WEIGHTS.EXTRA_BOLD,
  },
  {
    patterns: ["bold"],
    weight: FONT_WEIGHTS.BOLD,
    excludePatterns: ["semibold", "semi bold", "demibold", "demi bold", "extrabold", "extra bold", "ultrabold", "ultra bold"],
  },
  { patterns: ["black", "heavy"], weight: FONT_WEIGHTS.BLACK },
];

/**
 * Detect font weight from style string
 *
 * @param style - Font style string (e.g., "Bold", "Light Italic", "SemiBold")
 * @returns Detected font weight or undefined
 *
 * @example
 * detectWeight("Bold") // 700
 * detectWeight("Light Italic") // 300
 * detectWeight("ExtraBold") // 800
 * detectWeight("Regular") // 400
 */
export function detectWeight(style: string | undefined): FontWeight | undefined {
  if (!style) {
    return undefined;
  }

  const styleLower = style.toLowerCase();

  for (const rule of WEIGHT_RULES) {
    // Check if any exclude pattern matches
    if (rule.excludePatterns?.some((p) => styleLower.includes(p))) {
      continue;
    }

    // Check if any pattern matches
    if (rule.patterns.some((p) => styleLower.includes(p))) {
      return rule.weight;
    }
  }

  return undefined;
}

/**
 * Get the closest standard weight for a numeric value
 *
 * @param weight - Numeric weight (any value)
 * @returns Closest standard weight (100, 200, ..., 900)
 */
export function normalizeWeight(weight: number): FontWeight {
  const weights = Object.values(FONT_WEIGHTS);
  let closest: FontWeight = FONT_WEIGHTS.REGULAR;
  let minDiff = Math.abs(weight - closest);

  for (const w of weights) {
    const diff = Math.abs(weight - w);
    if (diff < minDiff) {
      minDiff = diff;
      closest = w as FontWeight;
    }
  }

  return closest;
}

/**
 * Get weight name from numeric value
 *
 * @param weight - Numeric weight
 * @returns Human-readable weight name
 */
export function getWeightName(weight: number): string {
  const normalized = normalizeWeight(weight);
  const entry = Object.entries(FONT_WEIGHTS).find(([, v]) => v === normalized);
  return entry ? entry[0].replace(/_/g, " ").toLowerCase() : "regular";
}
