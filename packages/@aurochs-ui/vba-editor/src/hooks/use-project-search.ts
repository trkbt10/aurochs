/**
 * @file Project-Wide Search Hook
 *
 * Search across all modules in the VBA project.
 */

import { useMemo, useCallback, useEffect } from "react";
import type { VbaProgramIr } from "@aurochs-office/vba";
import type {
  ProjectSearchMatch,
  SearchOptions,
  ModifiedSourceMap,
} from "../context/vba-editor/types";
import { findMatches, buildLineIndex } from "./use-search";

// =============================================================================
// Types
// =============================================================================

export type UseProjectSearchArgs = {
  readonly program: VbaProgramIr | undefined;
  readonly query: string;
  readonly options: SearchOptions;
  readonly isOpen: boolean;
  readonly modifiedSourceMap: ModifiedSourceMap;
  readonly onProjectMatchesUpdate: (
    matches: ReadonlyMap<string, readonly ProjectSearchMatch[]>,
    totalCount: number,
  ) => void;
};

export type UseProjectSearchResult = {
  readonly projectMatches: ReadonlyMap<string, readonly ProjectSearchMatch[]>;
  readonly totalCount: number;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for project-wide search.
 *
 * Searches across all modules in the VBA project.
 */
export function useProjectSearch(args: UseProjectSearchArgs): UseProjectSearchResult {
  const {
    program,
    query,
    options,
    isOpen,
    modifiedSourceMap,
    onProjectMatchesUpdate,
  } = args;

  // Compute matches for all modules
  const { projectMatches, totalCount } = useMemo(() => {
    if (!program || !query || !isOpen) {
      return { projectMatches: new Map<string, ProjectSearchMatch[]>(), totalCount: 0 };
    }

    const results = new Map<string, ProjectSearchMatch[]>();
    let total = 0;

    for (const module of program.modules) {
      // Get source (modified or original)
      const modifiedEntry = modifiedSourceMap.get(module.name);
      const source = modifiedEntry?.source ?? module.sourceCode;

      const matches = findMatches(source, query, options);

      if (matches.length > 0) {
        const lines = source.split("\n");
        const projectMatches: ProjectSearchMatch[] = matches.map((m) => ({
          ...m,
          moduleName: module.name,
          lineText: lines[m.line - 1] ?? "",
        }));

        results.set(module.name, projectMatches);
        total += matches.length;
      }
    }

    return { projectMatches: results, totalCount: total };
  }, [program, query, options, isOpen, modifiedSourceMap]);

  // Notify parent of changes
  useEffect(() => {
    if (isOpen) {
      onProjectMatchesUpdate(projectMatches, totalCount);
    }
  }, [projectMatches, totalCount, isOpen, onProjectMatchesUpdate]);

  return { projectMatches, totalCount };
}

/**
 * Get matches for a specific module.
 */
export function getModuleMatches(
  projectMatches: ReadonlyMap<string, readonly ProjectSearchMatch[]>,
  moduleName: string,
): readonly ProjectSearchMatch[] {
  return projectMatches.get(moduleName) ?? [];
}

/**
 * Get all matches as flat array.
 */
export function getAllMatches(
  projectMatches: ReadonlyMap<string, readonly ProjectSearchMatch[]>,
): readonly ProjectSearchMatch[] {
  const all: ProjectSearchMatch[] = [];
  for (const matches of projectMatches.values()) {
    all.push(...matches);
  }
  return all;
}
