/**
 * @file useFontCatalogFamilies
 *
 * Loads the injected FontCatalog family list for use in editor dropdowns.
 */

import { useEffect, useState } from "react";
import type { FontCatalog, FontCatalogFamilyRecord } from "../../../fonts/types";

export type FontCatalogFamiliesState = {
  readonly families: readonly string[];
  readonly records: readonly FontCatalogFamilyRecord[];
  readonly status: "idle" | "loading" | "loaded" | "error";
  readonly errorMessage: string | null;
};

/**
 * Loads `fontCatalog.listFamilies()` and tracks status/errors.
 *
 * Safe under React.StrictMode: in-flight responses are ignored after unmount.
 */
export function useFontCatalogFamilies(fontCatalog: FontCatalog | undefined): FontCatalogFamiliesState {
  const [state, setState] = useState<FontCatalogFamiliesState>(() => ({
    families: [],
    records: [],
    status: fontCatalog ? "loading" : "idle",
    errorMessage: null,
  }));

  useEffect(() => {
    if (!fontCatalog) {
      setState({ families: [], records: [], status: "idle", errorMessage: null });
      return;
    }

    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));
    const canceled = { value: false };

    const load = async () => {
      const maybeRecords = fontCatalog.listFamilyRecords ? await Promise.resolve(fontCatalog.listFamilyRecords()) : null;
      if (maybeRecords && Array.isArray(maybeRecords)) {
        const families = maybeRecords.map((record) => record.family);
        return { families, records: maybeRecords };
      }
      const families = await Promise.resolve(fontCatalog.listFamilies());
      const records: FontCatalogFamilyRecord[] = families.map((family) => ({ family }));
      return { families, records };
    };

    void load()
      .then(({ families, records }) => {
        if (canceled.value) {
          return;
        }
        setState({ families, records, status: "loaded", errorMessage: null });
      })
      .catch((error: unknown) => {
        if (canceled.value) {
          return;
        }
        setState({
          families: [],
          records: [],
          status: "error",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      canceled.value = true;
    };
  }, [fontCatalog]);

  return state;
}
