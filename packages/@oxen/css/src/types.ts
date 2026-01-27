/**
 * @file CSS type definitions
 * Types for type-safe CSS style construction
 */

/**
 * Branded type for CSS style strings.
 * Ensures type safety when passing styles to HTML elements.
 */
export type CssString = string & { readonly __brand: "CssString" };

/**
 * CSS property map with common properties.
 * Uses camelCase keys which are converted to kebab-case at build time.
 */
export type CssProperties = {
  // Positioning
  position?: "absolute" | "relative" | "fixed" | "static";
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  zIndex?: number | string;

  // Dimensions
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;

  // Display & Layout
  display?: "block" | "inline" | "flex" | "none" | "inline-block" | "inline-flex";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
  flex?: string;

  // Typography
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: number | "bold" | "normal" | "bolder" | "lighter" | string;
  fontStyle?: "normal" | "italic" | "oblique";
  textDecoration?: "none" | "underline" | "line-through" | "overline" | string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textAlign?: "left" | "right" | "center" | "justify";
  verticalAlign?:
    | "baseline"
    | "top"
    | "middle"
    | "bottom"
    | "sub"
    | "super"
    | "text-top"
    | "text-bottom"
    | string;
  letterSpacing?: string;
  lineHeight?: string | number;
  direction?: "ltr" | "rtl";
  whiteSpace?: "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line";
  wordBreak?: "normal" | "break-all" | "keep-all" | "break-word";

  // Colors
  color?: string;
  backgroundColor?: string;
  opacity?: number | string;

  // Borders
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRadius?: string;
  borderCollapse?: "collapse" | "separate";
  borderWidth?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  borderColor?: string;

  // Spacing
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;

  // Transform & Animation
  transform?: string;
  transformOrigin?: string;
  transition?: string;

  // Overflow
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  overflowX?: "visible" | "hidden" | "scroll" | "auto";
  overflowY?: "visible" | "hidden" | "scroll" | "auto";
  overflowWrap?: "normal" | "break-word" | "anywhere";
  wordWrap?: "normal" | "break-word";

  // Background
  background?: string;
  backgroundImage?: string;
  backgroundSize?: "cover" | "contain" | "auto" | string;
  backgroundPosition?: string;
  backgroundRepeat?: "repeat" | "no-repeat" | "repeat-x" | "repeat-y";

  // Box Model
  boxSizing?: "border-box" | "content-box";
  boxShadow?: string;

  // Object
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  objectPosition?: string;

  // Cursor
  cursor?: "pointer" | "default" | "move" | "not-allowed" | "grab" | "grabbing" | string;

  // Visibility
  visibility?: "visible" | "hidden" | "collapse";

  // Filter
  filter?: string;

  // Clip
  clipPath?: string;

  // Index signature for additional properties
  [key: string]: string | number | undefined;
};

