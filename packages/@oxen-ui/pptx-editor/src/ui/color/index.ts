/**
 * @file Color UI components exports
 */

// Visualization
export { FillPreview, type FillPreviewProps } from "./FillPreview";

// Popovers
export { ColorPickerPopover, type ColorPickerPopoverProps } from "./ColorPickerPopover";
export { FillPickerPopover, type FillPickerPopoverProps } from "./FillPickerPopover";

// Input components
export {
  RgbSliders,
  type RgbSlidersProps,
  HslSliders,
  type HslSlidersProps,
  ColorModeSliders,
  type ColorModeSlidersProps,
  ColorPreviewInput,
  type ColorPreviewInputProps,
  HexColorEditor,
  type HexColorEditorProps,
} from "./components";

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
  SolidFillEditor,
  type SolidFillEditorProps,
  GradientStopRow,
  type GradientStopRowProps,
  GradientFillEditor,
  type GradientFillEditorProps,
} from "./fill";
