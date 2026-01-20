/**
 * @file Office Editor Components
 *
 * Shared UI components for Office document editors (PPTX, DOCX, etc.)
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

// Design tokens
export {
  tokens,
  colorTokens,
  radiusTokens,
  spacingTokens,
  fontTokens,
  iconTokens,
  injectCSSVariables,
  removeCSSVariables,
  generateCSSVariables,
  cssVar,
  CSS_VAR_MAP,
  type Tokens,
  type ColorTokens,
  type RadiusTokens,
  type SpacingTokens,
  type FontTokens,
  type IconTokens,
} from "./design-tokens";

// Icons
export * from "./icons";

// Primitives
export {
  Button,
  type ButtonProps,
  type ButtonSize,
  Input,
  type InputProps,
  Popover,
  type PopoverProps,
  Select,
  type SelectProps,
  SearchableSelect,
  type SearchableSelectProps,
  type SearchableSelectOption,
  type SearchableSelectItemProps,
  Slider,
  type SliderProps,
  Tabs,
  type TabsProps,
  type TabItem,
  ToggleButton,
  type ToggleButtonProps,
  Toggle,
  type ToggleProps,
} from "./primitives";

// Scroll / Virtualization
export {
  VirtualScroll,
  useVirtualScroll,
  useVirtualScrollContext,
  type VirtualScrollProps,
  type UseVirtualScrollOptions,
  type UseVirtualScrollReturn,
  type ViewportRect,
} from "./scroll";

// Context menu
export {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSubmenu,
  type ContextMenuProps,
  type ContextMenuItemProps,
  type ContextMenuSubmenuProps,
  type MenuItemId,
  type MenuItem,
  type MenuSubmenu,
  type MenuSeparator,
  type MenuEntry,
  isSeparator,
  isSubmenu,
  isMenuItem,
} from "./context-menu";

// Grid
export {
  clampRange,
  computePrefixSums,
  findIndexAtOffset,
} from "./grid";

// Layout
export {
  Accordion,
  type AccordionProps,
  FieldGroup,
  type FieldGroupProps,
  FieldRow,
  type FieldRowProps,
  InspectorSection,
  type InspectorSectionProps,
  Panel,
  type PanelProps,
  Section,
  type SectionProps,
} from "./layout";
