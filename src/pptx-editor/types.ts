/**
 * @file Editor-specific types for PPTX Editor
 */

/**
 * Common props for all editor components
 */
export type EditorProps<T> = {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * Editor state for useReducer pattern
 */
export type EditorState<T> = {
  readonly value: T;
  readonly originalValue: T;
  readonly isDirty: boolean;
};

/**
 * Editor actions for useReducer
 */
export type EditorAction<T> =
  | { readonly type: "SET_VALUE"; readonly payload: T }
  | { readonly type: "UPDATE_FIELD"; readonly path: string; readonly value: unknown }
  | { readonly type: "RESET" };

/**
 * Input types for primitive components
 */
export type InputType = "text" | "number";

/**
 * Button variants
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";

/**
 * Select option
 */
export type SelectOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
};
