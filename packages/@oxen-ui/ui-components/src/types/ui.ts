/**
 * @file UI-related type definitions
 *
 * Types for primitive UI components.
 */

/**
 * Input types for primitive components.
 */
export type InputType = "text" | "number";

/**
 * Button variants.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";

/**
 * Select option.
 */
export type SelectOption<T extends string = string> = {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
};
