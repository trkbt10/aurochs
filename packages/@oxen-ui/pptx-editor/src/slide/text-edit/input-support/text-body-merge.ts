/**
 * @file Text Body Merge Utilities
 *
 * Functions for merging edited plain text back into TextBody structures,
 * preserving original styling and properties.
 */

import type { TextBody, RunProperties, TextRun, ParagraphProperties } from "@oxen/pptx/domain";
import { getPlainText } from "./cursor";

type TextCharEntry = {
  readonly char: string;
  readonly kind: "text" | "field" | "break" | "paragraph";
  readonly properties: RunProperties | undefined;
  readonly fieldType?: string;
  readonly fieldId?: string;
  readonly paragraphProperties?: ParagraphProperties;
  readonly paragraphEndProperties?: RunProperties;
};

/**
 * Merge edited text into original TextBody, preserving styling.
 *
 * @param originalBody - Original TextBody to preserve bodyProperties from
 * @param newText - New plain text content
 * @param defaultRunProperties - Run properties to apply to all new runs (REQUIRED)
 */
export function mergeTextIntoBody(
  originalBody: TextBody,
  newText: string,
  defaultRunProperties: RunProperties,
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
  const mergedEntries = applySingleReplaceEdit(
    originalEntries,
    newText,
    defaultProps,
    originalBody.paragraphs[0]?.properties ?? {},
    originalBody.paragraphs[0]?.endProperties,
  );
  const paragraphs = buildParagraphsFromEntries(mergedEntries, originalBody);

  const fallbackParagraph: TextBody["paragraphs"][number] = {
    properties: originalBody.paragraphs[0]?.properties ?? {},
    runs: [{
      type: "text",
      text: "",
      properties: defaultProps,
    }],
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

function flattenTextBody(textBody: TextBody): TextCharEntry[] {
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

function applySingleReplaceEdit(
  originalEntries: TextCharEntry[],
  newText: string,
  defaultProps: RunProperties | undefined,
  fallbackParagraphProperties: ParagraphProperties,
  fallbackParagraphEndProperties?: RunProperties,
): TextCharEntry[] {
  const oldText = originalEntries.map((entry) => entry.char).join("");
  const oldLength = oldText.length;
  const newLength = newText.length;
  const minLength = Math.min(oldLength, newLength);
  const prefixMismatch = Array.from({ length: minLength }).findIndex(
    (_, index) => oldText[index] !== newText[index],
  );
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
  const insertedParagraphEndProperties = paragraphTemplateEntry?.paragraphEndProperties ?? fallbackParagraphEndProperties;

  const insertedEntries: TextCharEntry[] = Array.from(insertedText).map((char) => {
    if (char === "\n") {
      return {
        char,
        kind: "paragraph",
        properties: undefined,
        paragraphProperties: insertedParagraphProperties,
        paragraphEndProperties: insertedParagraphEndProperties,
      };
    }
    return {
      char,
      kind: "text",
      properties: defaultProps,
      paragraphProperties: insertedParagraphProperties,
      paragraphEndProperties: insertedParagraphEndProperties,
    };
  });

  return [...prefixEntries, ...insertedEntries, ...suffixEntries];
}

function buildParagraphsFromEntries(
  entries: TextCharEntry[],
  originalBody: TextBody
): TextBody["paragraphs"] {
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

  const finalState = entries.reduce<BuildState>((state, entry) => {
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

    const canAppend = state.currentRun
      && state.currentRun.kind === entry.kind
      && state.currentRun.properties === entry.properties
      && state.currentRun.fieldType === entry.fieldType
      && state.currentRun.fieldId === entry.fieldId;

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
  }, {
    paragraphs: [],
    runs: [],
    currentRun: null,
    currentParagraphProperties: initialProperties,
    currentParagraphEndProperties: initialEndProperties,
  });

  return pushParagraph(finalState).paragraphs;
}
