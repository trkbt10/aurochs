/**
 * @file Line-related exports
 */

export { LineNumbers, type LineNumbersProps } from "./LineNumbers";
export {
  useLineIndex,
  buildLineOffsets,
  findLineIndex,
  offsetToLineColumnFromIndex,
  lineColumnToOffsetFromIndex,
  type LineIndex,
} from "./use-line-index";
export {
  useLineTokenCache,
  useModuleTokenCache,
  type LineTokenCache,
} from "./use-line-token-cache";
export {
  useVirtualLines,
  type VirtualLinesState,
  type VirtualLinesConfig,
  type UseVirtualLinesResult,
} from "./use-virtual-lines";
