/**
 * @file Diagram builder package
 *
 * Provides builders for creating SmartArt/Diagram data models.
 * Domain types are in @aurochs-office/diagram/domain.
 *
 * @example
 * ```typescript
 * import { buildDataModel } from "@aurochs-builder/diagram";
 * import type { DiagramDataModel } from "@aurochs-office/diagram/domain";
 *
 * const dataModel: DiagramDataModel = buildDataModel({
 *   nodes: [
 *     { id: "1", text: "Item 1" },
 *     { id: "2", text: "Item 2", parentId: "1" },
 *   ],
 * });
 * ```
 */

// Builder-specific types
export type {
  DiagramNodeSpec,
  DiagramBuildSpec,
} from "./types";

// Builders
export { buildDataModel } from "./data-model-builder";
