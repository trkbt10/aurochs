/**
 * @file Color editor exports
 *
 * Color editing components and utilities.
 * UI components delegate to react-editor-ui internally.
 * Adapters convert between DrawingML types and react-editor-ui types.
 */

// Visualization
export { FillPreview, type FillPreviewProps } from "./FillPreview";

// Popovers (API-compatible wrappers over react-editor-ui)
export { ColorPickerPopover, type ColorPickerPopoverProps } from "./ColorPickerPopover";
export { FillPickerPopover, type FillPickerPopoverProps } from "./FillPickerPopover";

// Conversion utilities
export {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  parseHexInput,
  hexToRgbCss,
  type RgbColor,
  type HslColor,
} from "./color-convert";

// Fill utilities
export {
  type FillType,
  fillTypeOptions,
  createDefaultColor,
  createDefaultFill,
  getHexFromColor,
  getStopHex,
} from "./fill";

// Adapters (DrawingML ↔ react-editor-ui)
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
} from "./adapters";

// Composed components (react-editor-ui wrapped with DrawingML props)
export {
  AdaptedColorPicker,
  type AdaptedColorPickerProps,
  AdaptedColorInput,
  type AdaptedColorInputProps,
  AdaptedFillPanel,
  type AdaptedFillPanelProps,
  AdaptedGradientEditor,
  type AdaptedGradientEditorProps,
} from "./composed";

// Context
export {
  ColorEditingProvider,
  useColorEditing,
  type ColorEditingContextValue,
  type ColorEditingProviderProps,
} from "./context";
