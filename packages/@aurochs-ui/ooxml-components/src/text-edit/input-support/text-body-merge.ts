/**
 * @file Text Body Merge Utilities
 *
 * Functions for merging edited plain text back into TextBody structures,
 * preserving original styling and properties.
 */

import type { TextBody, RunProperties, TextRun, ParagraphProperties } from "@aurochs-office/pptx/domain";
import { getPlainText } from "@aurochs-ui/editor-core/text-edit";

export type TextCharEntry = {
  readonly char: string;
  readonly kind: "text" | "field" | "break" | "paragraph";
  readonly properties: RunProperties | undefined;
  readonly fieldType?: string;
  readonly fieldId?: string;
  readonly paragraphProperties?: ParagraphProperties;
  readonly paragraphEndProperties?: RunProperties;
};

/**
 * Serializable representation of a styled text character for clipboard transfer.
 * Contains only the data needed to reconstruct styled text on paste.
 */
export type StyledCharEntry = {
  readonly char: string;
  readonly kind: "text" | "field" | "break" | "paragraph";
  readonly properties: RunProperties | undefined;
};

/**
 * Pending styled paste context.
 *
 * When the user copies styled text within the editor, we store per-character
 * style information. On the next merge (triggered by the textarea's native
 * paste), we use this to apply the original styles to the inserted region
 * instead of falling back to insertion-point inheritance.
 *
 * The `plainText` field is used to verify the paste matches the copied content.
 * If the user copies from an external source between our copy and the paste,
 * the system clipboard text won't match and we discard the stale context.
 */
export type PendingStyledPaste = {
  readonly plainText: string;
  readonly entries: readonly StyledCharEntry[];
};

type MergeTextIntoBodyOptions = {
  readonly originalBody: TextBody;
  readonly newText: string;
  readonly defaultRunProperties: RunProperties;
  readonly pendingStyledPaste?: PendingStyledPaste | null;
};

/**
 * Find run properties at the insertion point by scanning backwards from
 * prefixLength. Returns the properties of the nearest preceding text or field
 * entry, or defaultProps when none exist.
 */
function resolveInsertionRunProperties(
  entries: readonly TextCharEntry[],
  prefixLength: number,
  defaultProps: RunProperties | undefined,
): RunProperties | undefined {
  for (let i = prefixLength - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry?.kind === "text" || entry?.kind === "field") {
      return entry.properties;
    }
  }
  return defaultProps;
}

/**
 * Merge edited text into original TextBody, preserving styling.
 */
export function mergeTextIntoBody(
  { originalBody, newText, defaultRunProperties, pendingStyledPaste }: MergeTextIntoBodyOptions,
): TextBody {
  if (!originalBody) {
    throw new Error("mergeTextIntoBody requires originalBody.");
  }
  if (typeof newText !== "string") {
    throw new Error("mergeTextIntoBody requires newText as a string.");
  }
  if (!defaultRunProperties) {
    throw new Error("mergeTextIntoBody requires defaultRunProperties.");
  }

  if (getPlainText(originalBody) === newText) {
    return originalBody;
  }

  const defaultProps = Object.keys(defaultRunProperties).length > 0 ? defaultRunProperties : undefined;
  const originalEntries = flattenTextBody(originalBody);
  const mergedEntries = applySingleReplaceEdit({
    originalEntries,
    newText,
    defaultProps,
    fallbackParagraphProperties: originalBody.paragraphs[0]?.properties ?? {},
    fallbackParagraphEndProperties: originalBody.paragraphs[0]?.endProperties,
    pendingStyledPaste: pendingStyledPaste ?? undefined,
  });
  const paragraphs = buildParagraphsFromEntries(mergedEntries, originalBody);

  const fallbackParagraph: TextBody["paragraphs"][number] = {
    properties: originalBody.paragraphs[0]?.properties ?? {},
    runs: [
      {
        type: "text",
        text: "",
        properties: defaultProps,
      },
    ],
    endProperties: originalBody.paragraphs[0]?.endProperties,
  };

  return {
    bodyProperties: originalBody.bodyProperties,
    paragraphs: paragraphs.length > 0 ? paragraphs : [fallbackParagraph],
  };
}

/**
 * Extract default RunProperties from a TextBody.
 * Uses the first run's properties, or empty object if none found.
 */
export function extractDefaultRunProperties(textBody: TextBody): RunProperties {
  const firstPara = textBody.paragraphs[0];
  if (!firstPara) {
    return {};
  }
  const firstRun = firstPara.runs[0];
  if (!firstRun || firstRun.type !== "text") {
    return {};
  }
  return firstRun.properties ?? {};
}

/**
 * Flatten a TextBody into per-character entries.
 * Each entry carries its run properties, paragraph properties, and character kind.
 */
export function flattenTextBody(textBody: TextBody): TextCharEntry[] {
  const entries: TextCharEntry[] = [];

  textBody.paragraphs.forEach((paragraph, paragraphIndex) => {
    const paraProperties = paragraph.properties;
    const paraEndProperties = paragraph.endProperties;
    paragraph.runs.forEach((run) => {
      switch (run.type) {
        case "text": {
          for (const char of run.text) {
            entries.push({
              char,
              kind: "text",
              properties: run.properties,
              paragraphProperties: paraProperties,
              paragraphEndProperties: paraEndProperties,
            });
          }
          break;
        }
        case "field": {
          for (const char of run.text) {
            entries.push({
              char,
              kind: "field",
              properties: run.properties,
              fieldType: run.fieldType,
              fieldId: run.id,
              paragraphProperties: paraProperties,
              paragraphEndProperties: paraEndProperties,
            });
          }
          break;
        }
        case "break": {
          entries.push({
            char: "\n",
            kind: "break",
            properties: run.properties,
            paragraphProperties: paraProperties,
            paragraphEndProperties: paraEndProperties,
          });
          break;
        }
      }
    });

    if (paragraphIndex < textBody.paragraphs.length - 1) {
      const nextParagraph = textBody.paragraphs[paragraphIndex + 1];
      entries.push({
        char: "\n",
        kind: "paragraph",
        properties: undefined,
        paragraphProperties: nextParagraph?.properties,
        paragraphEndProperties: nextParagraph?.endProperties,
      });
    }
  });

  return entries;
}

type ApplySingleReplaceEditInput = {
  readonly originalEntries: TextCharEntry[];
  readonly newText: string;
  readonly defaultProps: RunProperties | undefined;
  readonly fallbackParagraphProperties: ParagraphProperties;
  readonly fallbackParagraphEndProperties?: RunProperties;
  readonly pendingStyledPaste?: PendingStyledPaste;
};

function applySingleReplaceEdit({
  originalEntries,
  newText,
  defaultProps,
  fallbackParagraphProperties,
  fallbackParagraphEndProperties,
  pendingStyledPaste,
}: ApplySingleReplaceEditInput): TextCharEntry[] {
  const oldText = originalEntries.map((entry) => entry.char).join("");
  const oldLength = oldText.length;
  const newLength = newText.length;
  const minLength = Math.min(oldLength, newLength);
  const prefixMismatch = Array.from({ length: minLength }).findIndex((_, index) => oldText[index] !== newText[index]);
  const prefixLength = prefixMismatch === -1 ? minLength : prefixMismatch;
  const maxSuffix = minLength - prefixLength;
  const suffixMismatch = Array.from({ length: maxSuffix }).findIndex(
    (_, index) => oldText[oldLength - 1 - index] !== newText[newLength - 1 - index],
  );
  const suffixLength = suffixMismatch === -1 ? maxSuffix : suffixMismatch;

  const insertedText = newText.slice(prefixLength, newLength - suffixLength);
  const prefixEntries = originalEntries.slice(0, prefixLength);
  const suffixEntries = originalEntries.slice(oldLength - suffixLength);

  const paragraphTemplateEntry = prefixLength > 0 ? originalEntries[prefixLength - 1] : originalEntries[0];
  const insertedParagraphProperties = paragraphTemplateEntry?.paragraphProperties ?? fallbackParagraphProperties;
  const insertedParagraphEndProperties =
    paragraphTemplateEntry?.paragraphEndProperties ?? fallbackParagraphEndProperties;

  // Check if we have a pending styled paste whose text matches the inserted region.
  // This is the mechanism by which internal copy-paste preserves per-character styles:
  // the textarea's native paste inserts plain text (preserving the undo stack),
  // and we apply the stored style information during the subsequent merge.
  const styledPasteEntries = resolveStyledPasteEntries(insertedText, pendingStyledPaste);

  // Determine run properties for inserted text from the insertion point context.
  // When the cursor is between two runs (e.g., "Aurochs|Office Document Toolkit"),
  // we use the properties of the nearest preceding text/field character.
  // This matches the typical editor behavior: typing inherits the style of the
  // preceding character. Falls back to the textBody-level default only when
  // no preceding text/field character exists (e.g., inserting at the very beginning).
  const insertionRunProperties: RunProperties | undefined = resolveInsertionRunProperties(
    originalEntries, prefixLength, defaultProps,
  );

  const insertedEntries: TextCharEntry[] = Array.from(insertedText).map((char, index) => {
    if (char === "\n") {
      return {
        char,
        kind: "paragraph" as const,
        properties: undefined,
        paragraphProperties: insertedParagraphProperties,
        paragraphEndProperties: insertedParagraphEndProperties,
      };
    }

    // If we have styled paste entries for this position, use the copied style.
    // Otherwise, inherit from the insertion point (preceding character).
    const styledEntry = styledPasteEntries?.[index];
    const properties = styledEntry ? styledEntry.properties : insertionRunProperties;

    return {
      char,
      kind: "text" as const,
      properties,
      paragraphProperties: insertedParagraphProperties,
      paragraphEndProperties: insertedParagraphEndProperties,
    };
  });

  return [...prefixEntries, ...insertedEntries, ...suffixEntries];
}

/**
 * Resolve styled paste entries for the inserted text region.
 *
 * Returns the styled entries array if the pending paste matches the inserted
 * text exactly (same characters in same order), or undefined if there's no
 * match (external paste, stale clipboard, or no pending paste).
 */
function resolveStyledPasteEntries(
  insertedText: string,
  pendingStyledPaste: PendingStyledPaste | undefined,
): readonly StyledCharEntry[] | undefined {
  if (!pendingStyledPaste) {
    return undefined;
  }
  if (pendingStyledPaste.plainText !== insertedText) {
    return undefined;
  }
  if (pendingStyledPaste.entries.length !== insertedText.length) {
    return undefined;
  }
  return pendingStyledPaste.entries;
}

/**
 * Compare two RunProperties for value equality.
 * Uses reference equality first (fast path for entries from the same TextBody),
 * then falls back to JSON-based deep comparison for entries from clipboard paste
 * where properties objects are new instances with identical values.
 */
function areRunPropertiesEqual(a: RunProperties | undefined, b: RunProperties | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildParagraphsFromEntries(entries: TextCharEntry[], originalBody: TextBody): TextBody["paragraphs"] {
  const initialProperties = originalBody.paragraphs[0]?.properties ?? {};
  const initialEndProperties = originalBody.paragraphs[0]?.endProperties;
  type BuildState = {
    readonly paragraphs: Array<TextBody["paragraphs"][number]>;
    readonly runs: TextRun[];
    readonly currentRun: {
      kind: "text" | "field";
      properties: RunProperties | undefined;
      fieldType?: string;
      fieldId?: string;
      text: string;
    } | null;
    readonly currentParagraphProperties: ParagraphProperties;
    readonly currentParagraphEndProperties: RunProperties | undefined;
  };

  const emptyTextRun: TextRun = { type: "text", text: "", properties: undefined };

  const buildRunFromCurrent = (run: NonNullable<BuildState["currentRun"]>): TextRun => {
    if (run.kind === "field" && run.fieldType && run.fieldId) {
      return {
        type: "field",
        fieldType: run.fieldType,
        id: run.fieldId,
        text: run.text,
        properties: run.properties,
      };
    }
    return {
      type: "text",
      text: run.text,
      properties: run.properties,
    };
  };

  const flushRun = (state: BuildState): BuildState => {
    if (!state.currentRun) {
      return state;
    }
    const nextRun = buildRunFromCurrent(state.currentRun);
    return {
      ...state,
      runs: [...state.runs, nextRun],
      currentRun: null,
    };
  };

  const pushParagraph = (state: BuildState): BuildState => {
    const flushed = flushRun(state);
    const paragraph: TextBody["paragraphs"][number] = {
      properties: flushed.currentParagraphProperties ?? {},
      runs: flushed.runs.length > 0 ? flushed.runs : [emptyTextRun],
      endProperties: flushed.currentParagraphEndProperties,
    };
    return {
      ...flushed,
      paragraphs: [...flushed.paragraphs, paragraph],
      runs: [],
    };
  };

  const finalState = entries.reduce<BuildState>(
    (state, entry) => {
      if (entry.kind === "paragraph") {
        const nextState = pushParagraph(state);
        return {
          ...nextState,
          currentParagraphProperties: entry.paragraphProperties ?? nextState.currentParagraphProperties ?? {},
          currentParagraphEndProperties: entry.paragraphEndProperties ?? nextState.currentParagraphEndProperties,
        };
      }

      if (entry.kind === "break") {
        const flushed = flushRun(state);
        return {
          ...flushed,
          runs: [
            ...flushed.runs,
            {
              type: "break",
              properties: entry.properties,
            },
          ],
        };
      }

      const canAppend =
        state.currentRun &&
        state.currentRun.kind === entry.kind &&
        areRunPropertiesEqual(state.currentRun.properties, entry.properties) &&
        state.currentRun.fieldType === entry.fieldType &&
        state.currentRun.fieldId === entry.fieldId;

      if (canAppend && state.currentRun) {
        return {
          ...state,
          currentRun: {
            ...state.currentRun,
            text: state.currentRun.text + entry.char,
          },
        };
      }

      const reset = flushRun(state);
      return {
        ...reset,
        currentRun: {
          kind: entry.kind,
          properties: entry.properties,
          fieldType: entry.fieldType,
          fieldId: entry.fieldId,
          text: entry.char,
        },
      };
    },
    {
      paragraphs: [],
      runs: [],
      currentRun: null,
      currentParagraphProperties: initialProperties,
      currentParagraphEndProperties: initialEndProperties,
    },
  );

  return pushParagraph(finalState).paragraphs;
}
