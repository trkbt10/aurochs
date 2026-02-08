/**
 * @file Node builder exports
 */

// Schema encoder
export { encodeFigSchema } from "./schema-encoder";

// Fig file builder
export { FigFileBuilder, createFigFile } from "./fig-file-builder";

// Group builder
export { GroupNodeBuilder, groupNode, type GroupNodeData } from "./group-builder";

// Section builder
export { SectionNodeBuilder, sectionNode, type SectionNodeData } from "./section-builder";

// Boolean operation builder
export {
  BooleanOperationNodeBuilder,
  booleanNode,
  BOOLEAN_OPERATION_TYPE_VALUES,
  type BooleanOperationNodeData,
  type BooleanOperationType,
} from "./boolean-builder";
