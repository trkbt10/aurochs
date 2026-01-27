/**
 * @file SpreadsheetML numFmt section picker
 *
 * Chooses which `;`-separated section applies to a numeric value, including support for
 * leading numeric conditions like `[<10]`.
 */

import { splitFormatSections } from "./sections";

export type PickedFormatSection = Readonly<{
  section: string;
  hasNegativeSection: boolean;
}>;

type NumericSectionCondition = Readonly<{
  op: "<" | "<=" | ">" | ">=" | "=" | "<>";
  compareTo: number;
}>;

function parseLeadingNumericCondition(section: string): NumericSectionCondition | null {
  const trimmedStart = section.trimStart();
  const state = { index: 0 };

  while (state.index < trimmedStart.length) {
    const ch = trimmedStart[state.index];
    if (ch !== "[") {
      return null;
    }
    const end = trimmedStart.indexOf("]", state.index + 1);
    if (end === -1) {
      return null;
    }

    const inner = trimmedStart.slice(state.index + 1, end);
    const match = /^\s*(<=|>=|<>|<|>|=)\s*([-+]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/u.exec(inner);
    if (match) {
      const op = match[1] as NumericSectionCondition["op"];
      const compareTo = Number(match[2]);
      if (!Number.isFinite(compareTo)) {
        return null;
      }
      return { op, compareTo };
    }

    state.index = end + 1;
  }

  return null;
}

function isNumericConditionMet(value: number, condition: NumericSectionCondition): boolean {
  switch (condition.op) {
    case "<":
      return value < condition.compareTo;
    case "<=":
      return value <= condition.compareTo;
    case ">":
      return value > condition.compareTo;
    case ">=":
      return value >= condition.compareTo;
    case "=":
      return value === condition.compareTo;
    case "<>":
      return value !== condition.compareTo;
  }
}

/**
 * Pick the effective section for a numeric value.
 *
 * @param formatCode - Full format code (may contain multiple sections)
 * @param value - Numeric value
 */
export function pickFormatSection(formatCode: string, value: number): PickedFormatSection {
  const sections = splitFormatSections(formatCode);
  const hasNegativeSection = sections.length > 1;

  if (sections.length <= 1) {
    const condition = parseLeadingNumericCondition(formatCode);
    if (condition && !isNumericConditionMet(value, condition)) {
      return { section: "General", hasNegativeSection: false };
    }
    return { section: formatCode, hasNegativeSection: false };
  }

  const parsedSections = sections.map((section) => ({ section, condition: parseLeadingNumericCondition(section) }));
  const hasCondition = parsedSections.some(({ condition }) => condition !== null);
  if (hasCondition) {
    for (const candidate of parsedSections) {
      if (candidate.condition && isNumericConditionMet(value, candidate.condition)) {
        return { section: candidate.section, hasNegativeSection };
      }
    }

    for (let i = parsedSections.length - 1; i >= 0; i -= 1) {
      const candidate = parsedSections[i];
      if (candidate && candidate.condition === null) {
        return { section: candidate.section, hasNegativeSection };
      }
    }

    return { section: "General", hasNegativeSection };
  }

  if (value > 0) {
    return { section: sections[0]!, hasNegativeSection };
  }
  if (value < 0) {
    return { section: sections[1] ?? sections[0]!, hasNegativeSection };
  }
  return { section: sections[2] ?? sections[0]!, hasNegativeSection };
}

