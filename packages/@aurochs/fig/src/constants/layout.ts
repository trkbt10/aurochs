/**
 * @file Layout/AutoLayout-related constants for Figma fig format
 */

/** Stack mode values (for AutoLayout) */
export const STACK_MODE_VALUES = {
  NONE: 0,
  HORIZONTAL: 1,
  VERTICAL: 2,
  WRAP: 3,
} as const;

export type StackMode = keyof typeof STACK_MODE_VALUES;

/** Stack alignment values */
export const STACK_ALIGN_VALUES = {
  MIN: 0,
  CENTER: 1,
  MAX: 2,
  STRETCH: 3,
  BASELINE: 4,
  SPACE_BETWEEN: 5,
} as const;

export type StackAlign = keyof typeof STACK_ALIGN_VALUES;

/** Stack positioning values (for child constraints in AutoLayout) */
export const STACK_POSITIONING_VALUES = {
  AUTO: 0,
  ABSOLUTE: 1,
} as const;

export type StackPositioning = keyof typeof STACK_POSITIONING_VALUES;

/** Stack sizing values (for child sizing in AutoLayout) */
export const STACK_SIZING_VALUES = {
  FIXED: 0,
  FILL: 1,
  HUG: 2,
} as const;

export type StackSizing = keyof typeof STACK_SIZING_VALUES;

/** Constraint type values (for fixed positioning) */
export const CONSTRAINT_TYPE_VALUES = {
  MIN: 0,
  CENTER: 1,
  MAX: 2,
  STRETCH: 3,
  SCALE: 4,
} as const;

export type ConstraintType = keyof typeof CONSTRAINT_TYPE_VALUES;

/** Winding rule values (for vector paths) */
export const WINDING_RULE_VALUES = {
  NONZERO: 0,
  EVENODD: 1,
} as const;

export type WindingRule = keyof typeof WINDING_RULE_VALUES;
