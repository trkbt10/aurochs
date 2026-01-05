/**
 * @file Core module exports
 *
 * Organized by 3-axis architecture: parser / domain / render
 *
 * @see ECMA-376 Part 1
 */

// DrawingML processing is now in parser/drawing-ml, domain/drawing-ml, and render/drawing-ml

// Geometry calculations (shapes, text rectangles, connection sites)
export * from "./geometry";

// Unit conversions
export * from "./units";
