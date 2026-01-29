/**
 * @file ECMA-376 Bevel Profiles (Three.js Independent)
 *
 * Defines profile curves for ECMA-376 bevel presets.
 * Each profile is defined by a curve that maps t (0-1) to (inset, depth).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 */

import type { BevelProfile, BevelProfilePoint } from "./types";

// =============================================================================
// Profile Generation Helpers
// =============================================================================

/**
 * Generate quarter-circle profile points
 */
function generateCircleProfile(
  segments: number,
  curvature = 1,
): readonly BevelProfilePoint[] {
  const points: BevelProfilePoint[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 0.5 * curvature;
    const inset = Math.sin(angle) / Math.sin(Math.PI * 0.5 * curvature);
    const depth =
      (1 - Math.cos(angle)) / (1 - Math.cos(Math.PI * 0.5 * curvature));

    points.push({ t, inset, depth });
  }

  return points;
}

/**
 * Generate convex (outward bulging) profile
 */
function generateConvexProfile(segments: number): readonly BevelProfilePoint[] {
  const points: BevelProfilePoint[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inset = t;
    const depth = Math.pow(t, 0.6);

    points.push({ t, inset, depth });
  }

  return points;
}

/**
 * Generate relaxed inset profile (gentle curve)
 */
function generateRelaxedInsetProfile(
  segments: number,
): readonly BevelProfilePoint[] {
  const points: BevelProfilePoint[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inset = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const depth = t;

    points.push({ t, inset, depth });
  }

  return points;
}

/**
 * Generate divot (concave) profile
 */
function generateDivotProfile(segments: number): readonly BevelProfilePoint[] {
  const points: BevelProfilePoint[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inset = t;
    const depth = Math.pow(t, 1.5);

    points.push({ t, inset, depth });
  }

  return points;
}

// =============================================================================
// ECMA-376 Bevel Profile Definitions
// =============================================================================

/** Angle: Simple 45-degree chamfer */
export const ANGLE_PROFILE: BevelProfile = {
  name: "angle",
  points: [
    { t: 0, inset: 0, depth: 0 },
    { t: 1, inset: 1, depth: 1 },
  ],
};

/** Circle: Quarter-circle arc profile */
export const CIRCLE_PROFILE: BevelProfile = {
  name: "circle",
  points: generateCircleProfile(8),
};

/** Soft Round: Gentle curved profile */
export const SOFT_ROUND_PROFILE: BevelProfile = {
  name: "softRound",
  points: generateCircleProfile(6, 0.8),
};

/** Convex: Outward bulging profile */
export const CONVEX_PROFILE: BevelProfile = {
  name: "convex",
  points: generateConvexProfile(6),
};

/** Relaxed Inset: Gentle inward curve */
export const RELAXED_INSET_PROFILE: BevelProfile = {
  name: "relaxedInset",
  points: generateRelaxedInsetProfile(4),
};

/** Slope: Linear slope with slight curve */
export const SLOPE_PROFILE: BevelProfile = {
  name: "slope",
  points: [
    { t: 0, inset: 0, depth: 0 },
    { t: 0.3, inset: 0.4, depth: 0.2 },
    { t: 0.7, inset: 0.8, depth: 0.6 },
    { t: 1, inset: 1, depth: 1 },
  ],
};

/** Hard Edge: Sharp, minimal bevel */
export const HARD_EDGE_PROFILE: BevelProfile = {
  name: "hardEdge",
  points: [
    { t: 0, inset: 0, depth: 0 },
    { t: 0.2, inset: 0.8, depth: 0.2 },
    { t: 1, inset: 1, depth: 1 },
  ],
};

/** Cross: Step-like profile */
export const CROSS_PROFILE: BevelProfile = {
  name: "cross",
  points: [
    { t: 0, inset: 0, depth: 0 },
    { t: 0.5, inset: 0.5, depth: 0 },
    { t: 0.5, inset: 0.5, depth: 0.5 },
    { t: 1, inset: 1, depth: 0.5 },
    { t: 1, inset: 1, depth: 1 },
  ],
};

/** Art Deco: Stepped decorative profile */
export const ART_DECO_PROFILE: BevelProfile = {
  name: "artDeco",
  points: [
    { t: 0, inset: 0, depth: 0 },
    { t: 0.33, inset: 0.33, depth: 0.1 },
    { t: 0.33, inset: 0.33, depth: 0.4 },
    { t: 0.66, inset: 0.66, depth: 0.5 },
    { t: 0.66, inset: 0.66, depth: 0.8 },
    { t: 1, inset: 1, depth: 1 },
  ],
};

/** Divot: Concave inward curve */
export const DIVOT_PROFILE: BevelProfile = {
  name: "divot",
  points: generateDivotProfile(4),
};

/** Riblet: Multiple small ridges */
export const RIBLET_PROFILE: BevelProfile = {
  name: "riblet",
  points: [
    { t: 0, inset: 0, depth: 0 },
    { t: 0.25, inset: 0.25, depth: 0.4 },
    { t: 0.5, inset: 0.5, depth: 0.2 },
    { t: 0.75, inset: 0.75, depth: 0.6 },
    { t: 1, inset: 1, depth: 1 },
  ],
};

/** Cool Slant: Dramatic angled profile */
export const COOL_SLANT_PROFILE: BevelProfile = {
  name: "coolSlant",
  points: [
    { t: 0, inset: 0, depth: 0 },
    { t: 0.2, inset: 0.6, depth: 0.1 },
    { t: 1, inset: 1, depth: 1 },
  ],
};

// =============================================================================
// Profile Registry
// =============================================================================

/**
 * Profile registry for lookup by ECMA-376 preset name
 */
export const BEVEL_PROFILES: ReadonlyMap<string, BevelProfile> = new Map([
  ["angle", ANGLE_PROFILE],
  ["circle", CIRCLE_PROFILE],
  ["softRound", SOFT_ROUND_PROFILE],
  ["convex", CONVEX_PROFILE],
  ["relaxedInset", RELAXED_INSET_PROFILE],
  ["slope", SLOPE_PROFILE],
  ["hardEdge", HARD_EDGE_PROFILE],
  ["cross", CROSS_PROFILE],
  ["artDeco", ART_DECO_PROFILE],
  ["divot", DIVOT_PROFILE],
  ["riblet", RIBLET_PROFILE],
  ["coolSlant", COOL_SLANT_PROFILE],
]);

/**
 * Get bevel profile by ECMA-376 preset name
 */
export function getBevelProfile(presetName: string): BevelProfile {
  return BEVEL_PROFILES.get(presetName) ?? ANGLE_PROFILE;
}
