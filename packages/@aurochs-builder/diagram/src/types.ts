/**
 * @file Diagram builder types
 *
 * Types for building SmartArt/Diagram elements across PPTX and DOCX.
 * These are simplified spec types for the builder API.
 */

/**
 * Text run in a diagram
 */
export type DiagramTextRun = {
  readonly type: "text";
  readonly text: string;
};

/**
 * Paragraph properties in a diagram
 */
export type DiagramParagraphProperties = {
  readonly alignment?: "left" | "center" | "right";
};

/**
 * Paragraph in a diagram text body
 */
export type DiagramParagraph = {
  readonly runs: readonly DiagramTextRun[];
  readonly properties: DiagramParagraphProperties;
};

/**
 * Text body in a diagram point
 */
export type DiagramTextBody = {
  readonly paragraphs: readonly DiagramParagraph[];
};

/**
 * Diagram point type
 */
export type DiagramPointType = "doc" | "node" | "sibTrans" | "parTrans" | "asst" | "pres";

/**
 * Diagram point (node) in the data model
 */
export type DiagramPoint = {
  /** Unique model ID */
  readonly modelId: string;
  /** Point type */
  readonly type: DiagramPointType;
  /** Text content (optional) */
  readonly textBody?: DiagramTextBody;
  /** Connection ID (for presentation nodes) */
  readonly cxnId?: string;
};

/**
 * Connection type in diagram
 */
export type DiagramConnectionType = "parOf" | "sibTrans" | "presOf" | "presParOf" | "unknownRelationship";

/**
 * Connection between diagram points
 */
export type DiagramConnection = {
  /** Unique model ID */
  readonly modelId: string;
  /** Connection type */
  readonly type: DiagramConnectionType;
  /** Source point ID */
  readonly sourceId: string;
  /** Destination point ID */
  readonly destinationId: string;
  /** Order in source */
  readonly sourceOrder: number;
  /** Order in destination */
  readonly destinationOrder: number;
};

/**
 * Diagram data model (dgm:dataModel)
 */
export type DiagramDataModel = {
  /** All points in the diagram */
  readonly points: readonly DiagramPoint[];
  /** All connections between points */
  readonly connections: readonly DiagramConnection[];
};

/**
 * Diagram layout definition (simplified)
 */
export type DiagramLayoutDefinition = {
  readonly uniqueId: string;
  readonly name?: string;
};

/**
 * Diagram style definition (simplified)
 */
export type DiagramStyleDefinition = {
  readonly uniqueId: string;
  readonly name?: string;
};

/**
 * Diagram colors definition (simplified)
 */
export type DiagramColorsDefinition = {
  readonly uniqueId: string;
  readonly name?: string;
};

/**
 * Diagram node specification for building simple diagrams
 */
export type DiagramNodeSpec = {
  /** Node ID */
  readonly id: string;
  /** Node text content */
  readonly text: string;
  /** Parent node ID (optional, for hierarchical diagrams) */
  readonly parentId?: string;
  /** Node type (node, sibTrans, parTrans) */
  readonly type?: "node" | "sibTrans" | "parTrans";
};

/**
 * Diagram build specification
 */
export type DiagramBuildSpec = {
  /** Diagram layout type ID (e.g., urn:microsoft.com/office/officeart/2005/8/layout/hierarchy1) */
  readonly layoutTypeId?: string;
  /** Diagram style type ID */
  readonly styleTypeId?: string;
  /** Diagram color scheme type ID */
  readonly colorTypeId?: string;
  /** Diagram nodes */
  readonly nodes: readonly DiagramNodeSpec[];
};
