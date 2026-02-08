/**
 * @file Diagram builder package
 *
 * Provides builders for creating SmartArt/Diagram XML documents for PPTX and DOCX.
 * This package provides a simplified builder API for diagram data models.
 *
 * @example
 * ```typescript
 * import { buildDataModel } from "@aurochs-builder/diagram";
 *
 * const dataModel = buildDataModel({
 *   nodes: [
 *     { id: "1", text: "Item 1" },
 *     { id: "2", text: "Item 2", parentId: "1" },
 *   ],
 * });
 * ```
 */

// Types
export type {
  DiagramTextRun,
  DiagramParagraphProperties,
  DiagramParagraph,
  DiagramTextBody,
  DiagramPointType,
  DiagramPoint,
  DiagramConnectionType,
  DiagramConnection,
  DiagramDataModel,
  DiagramLayoutDefinition,
  DiagramStyleDefinition,
  DiagramColorsDefinition,
  DiagramNodeSpec,
  DiagramBuildSpec,
} from "./types";

// Builders
export { buildDataModel } from "./data-model-builder";
