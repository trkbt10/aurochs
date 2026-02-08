/**
 * @file Mixed value context for multi-selection editing
 *
 * When multiple items are selected and their property values differ,
 * the UI shows "Mixed" indicators. MixedContext tracks which fields
 * are in this state.
 */

/**
 * Context indicating which fields have mixed values across a multi-selection.
 *
 * - If a field key is in `mixedFields`, the value is `undefined` because items disagree.
 * - If a field key is NOT in `mixedFields` and the value is `undefined`, the property is not applicable.
 */
export type MixedContext = {
  readonly mixedFields?: ReadonlySet<string>;
};

/**
 * Check if a specific field is in the "mixed" state.
 */
export function isMixedField(ctx: MixedContext | undefined, field: string): boolean {
  return ctx?.mixedFields?.has(field) ?? false;
}
