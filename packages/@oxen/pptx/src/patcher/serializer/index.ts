/**
 * @file Serializer module
 */

// Phase 4: Fill / Line / Effects
export { serializeColor } from "./color";
export { serializeFill, serializeGradientFill, serializePatternFill, serializeBlipFill } from "./fill";
export { serializeLine } from "./line";
export { serializeEffects } from "./effects";
export { serializeTransform, patchTransformElement } from "./transform";

// Phase 5: TextBody
export { serializeTextBody, patchTextBodyElement } from "./text";
export { serializeParagraph } from "./paragraph";
export {
  serializeBodyProperties,
  serializeParagraphProperties,
  serializeRunProperties,
  serializeEndParaRunProperties,
} from "./text-properties";

// Phase 10: Table
export { serializeDrawingTable } from "./table";
