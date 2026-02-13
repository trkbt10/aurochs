/**
 * @file VBA module public exports
 *
 * Provides VBA macro support for Office documents:
 * - OVBA parser for vbaProject.bin (MS-OVBA)
 * - VBA intermediate representation types
 * - VBA runtime (minimal subset)
 * - Host adapter interfaces
 *
 * @see MS-OVBA (Office VBA File Format)
 * @see docs/plans/macro-runtime/02-layered-architecture.md
 */

// Core types
export type {
  VbaProgramIr,
  VbaProjectInfo,
  VbaModule,
  VbaModuleType,
  VbaProcedure,
  VbaProcedureType,
  VbaParameter,
  VbaTypeName,
  VbaReference,
} from "./types";

// Errors
export { VbaParseError, VbaNotImplementedError } from "./errors";
