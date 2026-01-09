/**
 * @file Text Body Merge Utilities
 *
 * Functions for merging edited plain text back into TextBody structures,
 * preserving original styling and properties.
 */

import type { TextBody, RunProperties, TextRun, ParagraphProperties } from "../../../../pptx/domain";
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

  let prefixLength = 0;
  const minLength = Math.min(oldLength, newLength);
  while (prefixLength < minLength && oldText[prefixLength] === newText[prefixLength]) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < minLength - prefixLength
    && oldText[oldLength - 1 - suffixLength] === newText[newLength - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const insertedText = newText.slice(prefixLength, newLength - suffixLength);
  const prefixEntries = originalEntries.slice(0, prefixLength);
  const suffixEntries = originalEntries.slice(oldLength - suffixLength);

  const paragraphTemplateEntry = prefixLength > 0
    ? originalEntries[prefixLength - 1]
    : originalEntries[0];
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
  const paragraphs: Array<TextBody["paragraphs"][number]> = [];
  let currentParagraphProperties = originalBody.paragraphs[0]?.properties ?? {};
  let currentParagraphEndProperties = originalBody.paragraphs[0]?.endProperties;
  // eslint-disable-next-line no-restricted-syntax -- incremental construction
  let runs: TextRun[] = [];
  // eslint-disable-next-line no-restricted-syntax -- incremental construction
  let currentRun: {
    kind: "text" | "field";
    properties: RunProperties | undefined;
    fieldType?: string;
    fieldId?: string;
    text: string;
  } | null = null;

  const flushRun = () => {
    if (!currentRun) {
      return;
    }
    if (currentRun.kind === "field" && currentRun.fieldType && currentRun.fieldId) {
      runs.push({
        type: "field",
        fieldType: currentRun.fieldType,
        id: currentRun.fieldId,
        text: currentRun.text,
        properties: currentRun.properties,
      });
    } else {
      runs.push({
        type: "text",
        text: currentRun.text,
        properties: currentRun.properties,
      });
    }
    currentRun = null;
  };

  const pushParagraph = () => {
    flushRun();
    paragraphs.push({
      properties: currentParagraphProperties ?? {},
      runs: runs.length > 0 ? runs : [{ type: "text", text: "", properties: undefined }],
      endProperties: currentParagraphEndProperties,
    });
    runs = [];
  };

  for (const entry of entries) {
    if (entry.kind === "paragraph") {
      pushParagraph();
      currentParagraphProperties = entry.paragraphProperties ?? currentParagraphProperties ?? {};
      currentParagraphEndProperties = entry.paragraphEndProperties ?? currentParagraphEndProperties;
      continue;
    }

    if (entry.paragraphProperties && currentParagraphProperties === undefined) {
      currentParagraphProperties = entry.paragraphProperties;
    }
    if (entry.paragraphEndProperties && currentParagraphEndProperties === undefined) {
      currentParagraphEndProperties = entry.paragraphEndProperties;
    }

    if (entry.kind === "break") {
      flushRun();
      runs.push({
        type: "break",
        properties: entry.properties,
      });
      continue;
    }

    if (
      currentRun
      && currentRun.kind === entry.kind
      && currentRun.properties === entry.properties
      && currentRun.fieldType === entry.fieldType
      && currentRun.fieldId === entry.fieldId
    ) {
      currentRun.text += entry.char;
    } else {
      flushRun();
      currentRun = {
        kind: entry.kind,
        properties: entry.properties,
        fieldType: entry.fieldType,
        fieldId: entry.fieldId,
        text: entry.char,
      };
    }
  }

  pushParagraph();
  return paragraphs;
}
