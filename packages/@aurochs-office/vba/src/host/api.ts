/**
 * @file VBA Host API interface
 *
 * Interface for host application adapters (Excel, Word, PowerPoint).
 * The VBA runtime dispatches host object calls through this interface.
 *
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

// =============================================================================
// Host API Interface
// =============================================================================

/**
 * Host API interface for Excel/Word/PowerPoint adapters.
 *
 * The runtime dispatches host object calls through this interface.
 * Each host provides its own implementation.
 */
export type HostApi = {
  /**
   * Resolve a top-level object name.
   *
   * @param name - Object name (e.g., "Application", "ThisWorkbook", "ActiveSheet")
   * @returns Host object handle or undefined if not found
   */
  readonly getGlobalObject: (name: string) => HostObject | undefined;

  /**
   * Get a property from a host object.
   *
   * @param obj - Host object handle
   * @param name - Property name
   * @returns Property value
   */
  readonly getProperty: (obj: HostObject, name: string) => VbaRuntimeValue;

  /**
   * Set a property on a host object.
   *
   * @param obj - Host object handle
   * @param name - Property name
   * @param value - Value to set
   */
  readonly setProperty: (obj: HostObject, name: string, value: VbaRuntimeValue) => void;

  /**
   * Call a method on a host object.
   *
   * @param obj - Host object handle
   * @param name - Method name
   * @param args - Method arguments
   * @returns Method return value
   */
  readonly callMethod: (
    obj: HostObject,
    name: string,
    args: readonly VbaRuntimeValue[]
  ) => VbaRuntimeValue;

  /**
   * Get an indexed property (default property with index).
   *
   * @param obj - Host object handle
   * @param indices - Index values
   * @returns Indexed value
   */
  readonly getIndexed?: (obj: HostObject, indices: readonly VbaRuntimeValue[]) => VbaRuntimeValue;

  /**
   * Set an indexed property (default property with index).
   *
   * @param obj - Host object handle
   * @param indices - Index values
   * @param value - Value to set
   */
  readonly setIndexed?: (
    obj: HostObject,
    indices: readonly VbaRuntimeValue[],
    value: VbaRuntimeValue
  ) => void;
};

// =============================================================================
// Host Object
// =============================================================================

declare const HOST_OBJECT_BRAND: unique symbol;

/**
 * Opaque host object handle.
 *
 * The runtime does not interpret this; the host adapter manages it.
 * This type uses a branded pattern to prevent accidental mixing with
 * plain objects.
 */
export type HostObject = {
  readonly [HOST_OBJECT_BRAND]: true;
  /** Host type name (e.g., "Range", "Worksheet", "Application") */
  readonly hostType: string;
};

// =============================================================================
// Runtime Values
// =============================================================================

/**
 * VBA runtime value (what the runtime passes to/from host API).
 */
export type VbaRuntimeValue =
  | null // Nothing
  | undefined // Empty
  | boolean
  | number
  | string
  | Date
  | HostObject
  | VbaRuntimeValue[]; // Array
