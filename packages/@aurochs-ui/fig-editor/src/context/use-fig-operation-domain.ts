/** @file Hook for resolving the current fig editor operation domain. */

import { useMemo } from "react";
import { useFigDrag, useFigEditor } from "./FigEditorContext";
import { resolveFigUserIntent } from "./fig-editor/user-intent";
import { resolveFigUserOperationDomain, type FigUserOperationDomain } from "./fig-editor/user-operation";

/** Resolves user operations from the same editor state that reducer guards consume. */
export function useFigOperationDomain(): FigUserOperationDomain {
  const { creationMode, textEdit } = useFigEditor();
  const { drag } = useFigDrag();
  return useMemo(
    () => resolveFigUserOperationDomain(resolveFigUserIntent({ creationMode, textEdit, drag })),
    [creationMode, drag, textEdit],
  );
}
