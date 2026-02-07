/**
 * @file @oxen-office/doc public API
 */

export { parseDoc, parseDocWithReport, type ParseDocOptions, type ParseDocResult } from "./parser";
export { convertDocToDocx } from "./converter";
export { extractDocDocument } from "./extractor";
export type { DocDocument, DocParagraph, DocTextRun } from "./domain/types";
