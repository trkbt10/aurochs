/**
 * @file Story types for component preview system
 */

import type { ReactNode } from "react";

/**
 * Control type definitions for story props
 */
export type ControlType =
  | { type: "select"; options: readonly string[] }
  | { type: "boolean" }
  | { type: "number"; min?: number; max?: number; step?: number }
  | { type: "text" }
  | { type: "range"; min: number; max: number; step?: number };

/**
 * Control definition for a single prop
 */
export type ControlDef<T> = {
  readonly label: string;
  readonly control: ControlType;
  readonly defaultValue: T;
};

/**
 * Story definition
 */
export type Story<Props extends Record<string, unknown> = Record<string, unknown>> = {
  /** Story display name */
  readonly name: string;
  /** Render function */
  readonly render: (props: Props) => ReactNode;
  /** Props controls */
  readonly controls?: { readonly [K in keyof Props]?: ControlDef<Props[K]> };
  /** Default props */
  readonly defaultProps?: Partial<Props>;
  /** Optional dark background */
  readonly darkBackground?: boolean;
};

/**
 * Component entry with multiple stories
 */
export type ComponentEntry = {
  /** Component name */
  readonly name: string;
  /** Component description */
  readonly description?: string;
  /** Stories for this component */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly stories: readonly Story<any>[];
};

/**
 * Category containing multiple components
 */
export type Category = {
  /** Category name */
  readonly name: string;
  /** Components in this category */
  readonly components: readonly ComponentEntry[];
};
