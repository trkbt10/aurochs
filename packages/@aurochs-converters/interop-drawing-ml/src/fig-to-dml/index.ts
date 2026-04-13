/**
 * @file Fig → DrawingML conversion functions
 *
 * Converts Figma domain types to ECMA-376 DrawingML domain types.
 * These are the canonical conversions shared by all Fig→OOXML pipelines.
 */

export { figColorToColor, figColorToHex } from "./color";
export { figFillsToDml } from "./fill";
export { figStrokeToDml } from "./line";
export { figEffectsToDml } from "./effects";
export { figTransformToDml } from "./transform";
