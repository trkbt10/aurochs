/**
 * @file Re-export from OOXML shared layer
 *
 * ResourceStore is the OOXML-level SoT for resource management,
 * defined in @aurochs-office/ooxml/domain/resource-store.
 */
export type {
  ResourceKind,
  ResourceSource,
  ResolvedResourceEntry,
  ResourceStore,
} from "@aurochs-office/ooxml/domain/resource-store";

export { createResourceStore } from "@aurochs-office/ooxml/domain/resource-store";

/** @deprecated Use createResourceStore() */
export { createResourceStore as createEmptyResourceStore } from "@aurochs-office/ooxml/domain/resource-store";
