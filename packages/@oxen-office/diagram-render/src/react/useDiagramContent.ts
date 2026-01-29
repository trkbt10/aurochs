/**
 * @file Hook for extracting diagram content from a resource store abstraction
 */

import { useMemo } from "react";

import type { ResourceEntry } from "../types";
type ParsedDiagramData<TShape> = {
  readonly shapes?: readonly TShape[];
};

export type UseDiagramContentOptions = {
  readonly dataResourceId: string | undefined;
  readonly getResource: <TParsed>(resourceId: string) => ResourceEntry<TParsed> | undefined;
};

export function useDiagramContent<TShape>(options: UseDiagramContentOptions): readonly TShape[] | undefined {
  const { dataResourceId, getResource } = options;

  return useMemo(() => {
    if (dataResourceId === undefined) {
      return undefined;
    }

    const entry = getResource<ParsedDiagramData<TShape>>(dataResourceId);
    return entry?.parsed?.shapes;
  }, [dataResourceId, getResource]);
}
