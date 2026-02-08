/**
 * @file Field and hyperlink extractor
 *
 * Reference: [MS-DOC] 2.8.25 – PlcFld
 *
 * Fields in DOC are delimited by special characters:
 *   \x13 (field begin) → \x14 (field separator) → \x15 (field end)
 *
 * PlcfFld: CP array (n+1 × 4B) + Fld array (n × 2B each: ch(1B) + flt(1B))
 */

import type { DocField, DocHyperlink, DocFormField } from "../domain/types";

/** Parsed field position from PlcfFld. */
type FieldMarker = {
  readonly cp: number;
  /** ch: 0x13=begin, 0x14=separator, 0x15=end */
  readonly ch: number;
  readonly flt: number;
};

/** Parse PlcfFld from the table stream. */
export function parsePlcfFld(tableStream: Uint8Array, fc: number, lcb: number): readonly FieldMarker[] {
  if (lcb === 0) return [];
  if (fc + lcb > tableStream.length) return [];

  // PlcfFld: (n+1) CPs (4B each) + n Fld entries (2B each)
  // size = (n+1)*4 + n*2 = 4 + 6*n → n = (lcb - 4) / 6
  const n = (lcb - 4) / 6;
  if (!Number.isInteger(n) || n <= 0) return [];

  const view = new DataView(tableStream.buffer, tableStream.byteOffset, tableStream.byteLength);
  const markers: FieldMarker[] = [];

  for (let i = 0; i < n; i++) {
    const cp = view.getInt32(fc + i * 4, true);
    const fldOffset = fc + (n + 1) * 4 + i * 2;
    const ch = tableStream[fldOffset];
    const flt = tableStream[fldOffset + 1];
    markers.push({ cp, ch, flt });
  }

  return markers;
}

/** Extract fields from PlcfFld markers and document text. */
export function extractFields(markers: readonly FieldMarker[], rawText: string): readonly DocField[] {
  const fields: DocField[] = [];
  // eslint-disable-next-line no-restricted-syntax -- state machine for field parsing
  let i = 0;

  while (i < markers.length) {
    const begin = markers[i];
    if (begin.ch !== 0x13) {
      i++;
      continue;
    }

    // Find separator and end
    let sepIndex = -1;
    let endIndex = -1;
    // eslint-disable-next-line no-restricted-syntax -- nested search
    let depth = 1;

    for (let j = i + 1; j < markers.length; j++) {
      if (markers[j].ch === 0x13) {
        depth++;
      } else if (markers[j].ch === 0x15) {
        depth--;
        if (depth === 0) {
          endIndex = j;
          break;
        }
      } else if (markers[j].ch === 0x14 && depth === 1) {
        sepIndex = j;
      }
    }

    if (endIndex === -1) {
      i++;
      continue;
    }

    const cpBegin = begin.cp;
    const cpEnd = markers[endIndex].cp;

    // Extract instruction text (between begin and separator, or begin and end)
    const instrEnd = sepIndex !== -1 ? markers[sepIndex].cp : cpEnd;
    const instruction = safeSubstring(rawText, cpBegin + 1, instrEnd).trim();

    // Extract result text (between separator and end)
    const result = sepIndex !== -1
      ? safeSubstring(rawText, markers[sepIndex].cp + 1, cpEnd).trim()
      : "";

    // Determine field type from instruction
    const spaceIdx = instruction.indexOf(" ");
    const type = spaceIdx !== -1 ? instruction.substring(0, spaceIdx) : instruction;

    fields.push({ type, instruction, result, cpStart: cpBegin, cpEnd });

    i = endIndex + 1;
  }

  return fields;
}

function safeSubstring(text: string, start: number, end: number): string {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  return text.substring(s, e);
}

/** Extract form fields (FORMTEXT, FORMCHECKBOX, FORMDROPDOWN) from fields. */
export function extractFormFields(fields: readonly DocField[]): readonly DocFormField[] {
  const result: DocFormField[] = [];

  for (const field of fields) {
    const upper = field.type.toUpperCase();
    if (upper === "FORMTEXT") {
      result.push({
        type: "text",
        ...parseFormFieldName(field.instruction),
        ...(field.result ? { defaultValue: field.result } : {}),
        cpStart: field.cpStart,
        cpEnd: field.cpEnd,
      });
    } else if (upper === "FORMCHECKBOX") {
      result.push({
        type: "checkbox",
        ...parseFormFieldName(field.instruction),
        cpStart: field.cpStart,
        cpEnd: field.cpEnd,
      });
    } else if (upper === "FORMDROPDOWN") {
      result.push({
        type: "dropdown",
        ...parseFormFieldName(field.instruction),
        cpStart: field.cpStart,
        cpEnd: field.cpEnd,
      });
    }
  }

  return result;
}

function parseFormFieldName(instruction: string): { name?: string } {
  // Form field name may appear after the type keyword, e.g. "FORMTEXT Text1"
  const match = /^FORM(?:TEXT|CHECKBOX|DROPDOWN)\s+(\S+)/i.exec(instruction);
  if (match) return { name: match[1] };
  return {};
}

/** Extract hyperlinks from fields. */
export function extractHyperlinks(fields: readonly DocField[]): readonly DocHyperlink[] {
  const links: DocHyperlink[] = [];

  for (const field of fields) {
    if (field.type !== "HYPERLINK") continue;

    const instr = field.instruction;
    // Parse: HYPERLINK "url" [\l "bookmark"]
    const urlMatch = /HYPERLINK\s+"([^"]*)"/.exec(instr);
    const anchorMatch = /\\l\s+"([^"]*)"/.exec(instr);

    links.push({
      url: urlMatch?.[1],
      anchor: anchorMatch?.[1],
      displayText: field.result || urlMatch?.[1] || "",
    });
  }

  return links;
}
