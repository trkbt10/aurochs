/**
 * @file Core module exports
 *
 * Organized by 3-axis architecture: parser / domain / render
 *
 * @see ECMA-376 Part 1
 */

// DrawingML processing (color, fill, background)
export * from "./dml";

// Geometry calculations (shapes, text rectangles, connection sites)
export * from "./geometry";

// Unit conversions
export * from "./units";

// ECMA-376 defaults and constants
export * from "./ecma376";

// Types
export * from "./types";

// Parser utilities
export { indexNodes } from "./node-indexer";
export { parseSlideSizeFromXml, parseDefaultTextStyle, parseAppVersion } from "./presentation-info";


