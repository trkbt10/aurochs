/**
 * @file Diagram data model builder
 *
 * Builds diagram data model (dgm:dataModel) from specification.
 */

import type { DiagramDataModel, DiagramPoint, DiagramConnection, DiagramNodeSpec, DiagramBuildSpec } from "./types";

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
function buildParentConnection(node: DiagramNodeSpec, orderIndex: number): DiagramConnection {
  if (!node.parentId) {
    // Root node connection
    return {
      modelId: `conn-${node.id}-root`,
      type: "parOf",
      sourceId: "0", // Document root
      destinationId: node.id,
      sourceOrder: orderIndex,
      destinationOrder: 0,
    };
  }

  return {
    modelId: `conn-${node.id}-${node.parentId}`,
    type: "parOf",
    sourceId: node.parentId,
    destinationId: node.id,
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
