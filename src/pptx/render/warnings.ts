/**
 * @file Render warnings and collection utilities
 *
 * Types and utilities for collecting warnings during rendering.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Render warning
 */
export type RenderWarning = {
  readonly type: "unsupported" | "fallback" | "error";
  readonly message: string;
  readonly element?: string;
  /** Additional details such as ECMA-376 specification references */
  readonly details?: string;
};

/**
 * Warning collector
 */
export type WarningCollector = {
  readonly add: (warning: RenderWarning) => void;
  readonly getAll: () => readonly RenderWarning[];
  readonly hasErrors: () => boolean;
};

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a warning collector
 */
export function createWarningCollector(): WarningCollector {
  const warnings: RenderWarning[] = [];

  return {
    add: (warning) => warnings.push(warning),
    getAll: () => warnings,
    hasErrors: () => warnings.some((w) => w.type === "error"),
  };
}
