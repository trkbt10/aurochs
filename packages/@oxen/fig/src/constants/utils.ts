/**
 * @file Utility types and functions for working with Figma enum values
 */

/**
 * Represents a Kiwi enum value with numeric value and string name
 */
export type EnumValue<T extends string> = { value: number; name: T };

/**
 * Convert a string enum name to a Kiwi enum value object
 *
 * @param name - The enum name (e.g., "CENTER", "HORIZONTAL")
 * @param values - The value map (e.g., STACK_ALIGN_VALUES)
 * @returns EnumValue object or undefined if name is undefined
 */
export function toEnumValue<T extends string>(
  name: T | undefined,
  values: Record<T, number>
): EnumValue<T> | undefined {
  if (name === undefined) {
    return undefined;
  }
  return { value: values[name], name };
}
