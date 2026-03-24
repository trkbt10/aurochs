/**
 * @file Adapter exports
 *
 * DrawingML to react-editor-ui type conversion functions and compatible types.
 */

export {
  toReactHex,
  fromReactHex,
  colorToColorValue,
  colorValueToColor,
  gradientFillToGradientValue,
  gradientValueToGradientFill,
  baseFillToFillValue,
  fillValueToBaseFill,
  type ReuiColorValue,
  type ReuiGradientType,
  type ReuiGradientStop,
  type ReuiGradientValue,
  type ReuiSolidFillValue,
  type ReuiGradientFillValue,
  type ReuiFillValue,
  type ReuiFillValueInput,
} from "./color-value-adapter";
