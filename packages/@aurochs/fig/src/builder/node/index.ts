/**
 * @file Node builder exports
 */

// Schema encoder
export { encodeFigSchema } from "./schema-encoder";

// Fig file builder
export { type FigFileBuilder, createFigFile } from "./fig-file-builder";

// Group builder
export { type GroupNodeBuilder, groupNode, type GroupNodeData } from "./group-builder";

// Section builder
export { type SectionNodeBuilder, sectionNode, type SectionNodeData } from "./section-builder";

// Boolean operation builder
export {
  type BooleanOperationNodeBuilder,
  booleanNode,
  BOOLEAN_OPERATION_TYPE_VALUES,
  type BooleanOperationNodeData,
  type BooleanOperationType,
} from "./boolean-builder";
