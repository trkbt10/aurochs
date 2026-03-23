/**
 * @file Diagram data model builder
 *
 * Builds diagram data model (dgm:dataModel) from specification.
 */

import type { DiagramDataModel, DiagramPoint, DiagramConnection } from "@aurochs-office/diagram/domain";
import type { DiagramNodeSpec, DiagramBuildSpec } from "./types";

/**
 * Build a diagram point from node spec
 */
function buildPoint(spec: DiagramNodeSpec): DiagramPoint {
  return {
    modelId: spec.id,
    type: spec.type ?? "node",
    textBody: {
      paragraphs: [
        {
          runs: [{ type: "text", text: spec.text }],
          properties: {},
        },
      ],
    },
  };
}

/**
 * Build diagram connection for a child node
 */
/**
 * Build a parOf connection.
 *
 * In tree-builder's interpretation of parOf:
 *   sourceId = child, destinationId = parent
 *
 * So to make node a child of its parent:
 *   sourceId = node.id, destinationId = parent
 */
function buildParentConnection(node: DiagramNodeSpec, orderIndex: number): DiagramConnection {
  return {
    modelId: `conn-${node.id}-${node.parentId ?? "root"}`,
    type: "parOf",
    sourceId: node.id,
    destinationId: node.parentId ?? "0",
    sourceOrder: orderIndex,
    destinationOrder: 0,
  };
}

/**
 * Build diagram data model from specification
 */
export function buildDataModel(spec: DiagramBuildSpec): DiagramDataModel {
  // Build document root point
  const rootPoint: DiagramPoint = {
    modelId: "0",
    type: "doc",
  };

  // Build points from nodes
  const nodePoints = spec.nodes.map((node) => buildPoint(node));

  // Build connections
  const connections = spec.nodes.map((node, orderIndex) => buildParentConnection(node, orderIndex));

  return {
    points: [rootPoint, ...nodePoints],
    connections,
  };
}
