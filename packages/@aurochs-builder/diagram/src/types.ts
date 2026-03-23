/**
 * @file Diagram builder types
 *
 * Builder-specific input types only.
 * Domain types (DiagramDataModel, DiagramPoint, DiagramConnection, etc.)
 * are in @aurochs-office/diagram/domain — import directly from there.
 */

/**
 * Diagram node specification for building simple diagrams.
 */
export type DiagramNodeSpec = {
  /** Node ID */
  readonly id: string;
  /** Node text content */
  readonly text: string;
  /** Parent node ID (optional, for hierarchical diagrams) */
  readonly parentId?: string;
  /** Node type */
  readonly type?: "node" | "sibTrans" | "parTrans";
};

/**
 * Diagram build specification.
 */
export type DiagramBuildSpec = {
  /** Diagram layout type ID */
  readonly layoutTypeId?: string;
  /** Diagram style type ID */
  readonly styleTypeId?: string;
  /** Diagram color scheme type ID */
  readonly colorTypeId?: string;
  /** Diagram nodes */
  readonly nodes: readonly DiagramNodeSpec[];
};
