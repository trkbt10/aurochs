/**
 * @file Hooks exports
 *
 * Hooks are exported directly from the context module.
 * Import useVbaEditor from "@aurochs-ui/vba-editor" or "@aurochs-ui/vba-editor/context".
 */

// Note: useVbaEditor is exported from the main index.ts and context/index.tsx
// to avoid deep re-export violations.

export {
  useSearchIntegration,
  findMatches,
  buildLineIndex,
} from "./use-search";
export type {
  UseSearchIntegrationArgs,
} from "./use-search";

export {
  useProjectSearch,
  getModuleMatches,
  getAllMatches,
} from "./use-project-search";
export type {
  UseProjectSearchArgs,
  UseProjectSearchResult,
} from "./use-project-search";
