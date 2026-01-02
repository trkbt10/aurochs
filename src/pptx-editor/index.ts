/**
 * @file PPTX Editor - React-based editor components for PPTX domain types
 *
 * This module provides editor components for editing PPTX domain objects.
 * Each editor is designed to be context-agnostic and can be used in
 * various mounting contexts (inline, popup, sidebar, context menu, etc.).
 *
 * @example
 * ```tsx
 * import { TransformEditor, ColorEditor, EditorConfigProvider } from "@lib/pptx-editor";
 *
 * function ShapePanel({ shape, onUpdate }) {
 *   return (
 *     <EditorConfigProvider config={{ compactMode: true }}>
 *       <TransformEditor
 *         value={shape.transform}
 *         onChange={(t) => onUpdate({ ...shape, transform: t })}
 *       />
 *     </EditorConfigProvider>
 *   );
 * }
 * ```
 */

// Types
export type {
  EditorProps,
  EditorState,
  EditorAction,
  InputType,
  ButtonVariant,
  SelectOption,
} from "./types";

// Context
export {
  EditorConfigProvider,
  useEditorConfig,
  type EditorConfig,
} from "./context";

// Hooks
export {
  createEditorReducer,
  useEditorReducer,
  simpleUpdate,
  nestedUpdate,
  type UpdateFn,
} from "./hooks";

// UI Primitives
export {
  Button,
  Input,
  Popover,
  Select,
  Slider,
  Tabs,
  Toggle,
  type ButtonProps,
  type InputProps,
  type PopoverProps,
  type SelectProps,
  type SliderProps,
  type TabItem,
  type TabsProps,
  type ToggleProps,
} from "./ui/primitives";

// UI Layout
export {
  Accordion,
  FieldGroup,
  FieldRow,
  type AccordionProps,
  type FieldGroupProps,
  type FieldRowProps,
} from "./ui/layout";

// UI Color
export {
  ColorSwatch,
  type ColorSwatchProps,
  type ColorSwatchSize,
} from "./ui/color";

// Editors
export {
  // Primitives
  PixelsEditor,
  DegreesEditor,
  PercentEditor,
  PointsEditor,
  TransformEditor,
  createDefaultTransform,
  type PixelsEditorProps,
  type DegreesEditorProps,
  type PercentEditorProps,
  type PointsEditorProps,
  type TransformEditorProps,
  // Color
  ColorSpecEditor,
  ColorTransformEditor,
  ColorEditor,
  FillEditor,
  LineEditor,
  createDefaultSrgbColor,
  createDefaultColor,
  createDefaultSolidFill,
  createNoFill,
  createDefaultLine,
  type ColorSpecEditorProps,
  type ColorTransformEditorProps,
  type ColorEditorProps,
  type FillEditorProps,
  type LineEditorProps,
  // Text
  RunPropertiesEditor,
  LineSpacingEditor,
  BulletStyleEditor,
  ParagraphPropertiesEditor,
  TextBodyEditor,
  createDefaultRunProperties,
  createDefaultLineSpacing,
  createDefaultBulletStyle,
  createDefaultParagraphProperties,
  createDefaultTextBody,
  type RunPropertiesEditorProps,
  type LineSpacingEditorProps,
  type BulletStyleEditorProps,
  type ParagraphPropertiesEditorProps,
  type TextBodyEditorProps,
} from "./editors";
