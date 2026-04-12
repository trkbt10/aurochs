/**
 * @file Context module exports
 */

export {
  createFigDesignDocument,
  createFigDesignDocumentFromLoaded,
  createEmptyFigDesignDocument,
} from "./fig-context";

export { createDemoFigDesignDocument } from "./demo-document";

export { treeToDocument, convertFigNode } from "./tree-to-document";

export { documentToTree, type DocumentToTreeResult } from "./document-to-tree";
