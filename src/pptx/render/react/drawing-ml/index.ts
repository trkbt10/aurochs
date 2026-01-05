/**
 * @file DrawingML React rendering module
 *
 * React components and hooks for rendering DrawingML elements.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

// Color module
export {
  useColor,
  resolveColorForReact,
  ColorSwatch,
  ColorSwatchRow,
  type ResolvedColorResult,
  type ColorSwatchProps,
  type ColorSwatchRowProps,
} from "./color";
