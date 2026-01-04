/**
 * @file 3D rendering types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.5 - 3D Rendering
 */

// =============================================================================
// 3D Types
// =============================================================================

/**
 * Light rig direction
 * @see ECMA-376 Part 1, Section 20.1.10.29 (ST_LightRigDirection)
 */
export type LightRigDirection =
  | "b"
  | "bl"
  | "br"
  | "l"
  | "r"
  | "t"
  | "tl"
  | "tr";

/**
 * Light rig preset type
 * @see ECMA-376 Part 1, Section 20.1.10.30 (ST_LightRigType)
 */
export type LightRigType =
  | "balanced"
  | "brightRoom"
  | "chilly"
  | "contrasting"
  | "flat"
  | "flood"
  | "freezing"
  | "glow"
  | "harsh"
  | "legacyFlat1"
  | "legacyFlat2"
  | "legacyFlat3"
  | "legacyFlat4"
  | "legacyHarsh1"
  | "legacyHarsh2"
  | "legacyHarsh3"
  | "legacyHarsh4"
  | "legacyNormal1"
  | "legacyNormal2"
  | "legacyNormal3"
  | "legacyNormal4"
  | "morning"
  | "soft"
  | "sunrise"
  | "sunset"
  | "threePt"
  | "twoPt";

/**
 * Camera preset type
 * @see ECMA-376 Part 1, Section 20.1.10.47 (ST_PresetCameraType)
 */
export type PresetCameraType =
  | "isometricBottomDown"
  | "isometricBottomUp"
  | "isometricLeftDown"
  | "isometricLeftUp"
  | "isometricOffAxis1Left"
  | "isometricOffAxis1Right"
  | "isometricOffAxis1Top"
  | "isometricOffAxis2Left"
  | "isometricOffAxis2Right"
  | "isometricOffAxis2Top"
  | "isometricOffAxis3Bottom"
  | "isometricOffAxis3Left"
  | "isometricOffAxis3Right"
  | "isometricOffAxis4Bottom"
  | "isometricOffAxis4Left"
  | "isometricOffAxis4Right"
  | "isometricRightDown"
  | "isometricRightUp"
  | "isometricTopDown"
  | "isometricTopUp"
  | "legacyObliqueBottom"
  | "legacyObliqueBottomLeft"
  | "legacyObliqueBottomRight"
  | "legacyObliqueFront"
  | "legacyObliqueLeft"
  | "legacyObliqueRight"
  | "legacyObliqueTop"
  | "legacyObliqueTopLeft"
  | "legacyObliqueTopRight"
  | "legacyPerspectiveBottom"
  | "legacyPerspectiveBottomLeft"
  | "legacyPerspectiveBottomRight"
  | "legacyPerspectiveFront"
  | "legacyPerspectiveLeft"
  | "legacyPerspectiveRight"
  | "legacyPerspectiveTop"
  | "legacyPerspectiveTopLeft"
  | "legacyPerspectiveTopRight"
  | "obliqueBottom"
  | "obliqueBottomLeft"
  | "obliqueBottomRight"
  | "obliqueLeft"
  | "obliqueRight"
  | "obliqueTop"
  | "obliqueTopLeft"
  | "obliqueTopRight"
  | "orthographicFront"
  | "perspectiveAbove"
  | "perspectiveAboveLeftFacing"
  | "perspectiveAboveRightFacing"
  | "perspectiveBelow"
  | "perspectiveContrastingLeftFacing"
  | "perspectiveContrastingRightFacing"
  | "perspectiveFront"
  | "perspectiveHeroicExtremeLeftFacing"
  | "perspectiveHeroicExtremeRightFacing"
  | "perspectiveHeroicLeftFacing"
  | "perspectiveHeroicRightFacing"
  | "perspectiveLeft"
  | "perspectiveRelaxed"
  | "perspectiveRelaxedModerately"
  | "perspectiveRight";

/**
 * Preset material type
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetMaterialType)
 */
export type PresetMaterialType =
  | "clear"
  | "dkEdge"
  | "flat"
  | "legacyMatte"
  | "legacyMetal"
  | "legacyPlastic"
  | "legacyWireframe"
  | "matte"
  | "metal"
  | "plastic"
  | "powder"
  | "softEdge"
  | "softmetal"
  | "translucentPowder"
  | "warmMatte";
