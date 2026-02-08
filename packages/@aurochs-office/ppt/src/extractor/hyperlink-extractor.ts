/**
 * @file Hyperlink extraction from PPT records
 *
 * PPT stores hyperlinks in a two-level indirection:
 * 1. Document-level ExObjListContainer → ExternalHyperlinkContainer → CString (URL)
 * 2. Slide-level InteractiveInfoInstance → exHyperlinkIdRef (references #1)
 *    + TxInteractiveInfoAtom → character range [begin, end)
 */

import type { PptRecord } from "../records/types";
import { RT } from "../records/record-types";
import { findChildByType, findChildrenByType } from "../records/record-iterator";

/** Map of exHyperlinkId → URL string */
export type HyperlinkMap = ReadonlyMap<number, string>;

/**
 * Extract hyperlink definitions from the DocumentContainer.
 * Returns a map from exHyperlinkId → URL.
 */
export function extractHyperlinkMap(documentRecord: PptRecord): HyperlinkMap {
  const map = new Map<number, string>();
  const docChildren = documentRecord.children ?? [];

  // Find ExObjListContainer
  const exObjList = findChildByType(docChildren, RT.ExObjListContainer);
  if (!exObjList) return map;

  // Find all ExternalHyperlinkContainer records
  const hyperlinkContainers = findChildrenByType(exObjList.children ?? [], RT.ExternalHyperlinkContainer);

  for (const container of hyperlinkContainers) {
    const children = container.children ?? [];

    // Parse ExternalHyperlinkAtom → get exHyperlinkId
    const atom = findChildByType(children, RT.ExternalHyperlinkAtom);
    if (!atom || atom.data.byteLength < 4) continue;

    const view = new DataView(atom.data.buffer, atom.data.byteOffset, atom.data.byteLength);
    const exHyperlinkId = view.getUint32(0, true);

    // Find CString with recInstance=0 (the "friendly name" / target URL)
    const cstrings = findChildrenByType(children, RT.CString);
    for (const cs of cstrings) {
      if (cs.recInstance === 0) {
        const url = decodeUtf16Le(cs.data);
        if (url.length > 0) {
          map.set(exHyperlinkId, url);
        }
        break;
      }
    }
  }

  return map;
}

/**
 * Text hyperlink range: character range [begin, end) linked to exHyperlinkIdRef.
 */
export type TextHyperlinkRange = {
  readonly begin: number;
  readonly end: number;
  readonly exHyperlinkIdRef: number;
};

/**
 * Extract text-level hyperlink ranges from an OfficeArtClientTextbox's children.
 * Returns ranges sorted by begin position.
 */
export function extractTextHyperlinkRanges(textboxChildren: readonly PptRecord[]): readonly TextHyperlinkRange[] {
  const ranges: TextHyperlinkRange[] = [];
  let i = 0;

  while (i < textboxChildren.length) {
    const rec = textboxChildren[i];

    if (rec.recType === RT.InteractiveInfoAtom) {
      // InteractiveInfoAtom (0x0FF2) with ver=15 is a container wrapping InteractiveInfoInstance
      const instance = rec.children
        ? findChildByType(rec.children, RT.InteractiveInfoInstance)
        : undefined;

      let exHyperlinkIdRef: number | undefined;

      if (instance && instance.data.byteLength >= 4) {
        // InteractiveInfoInstance payload: u32 soundIdRef, u32 exHyperlinkIdRef, u8 action, ...
        const view = new DataView(instance.data.buffer, instance.data.byteOffset, instance.data.byteLength);
        exHyperlinkIdRef = view.getUint32(4, true);
      } else if (!rec.children && rec.data.byteLength >= 8) {
        // Non-container version: direct atom data
        const view = new DataView(rec.data.buffer, rec.data.byteOffset, rec.data.byteLength);
        exHyperlinkIdRef = view.getUint32(4, true);
      }

      if (exHyperlinkIdRef !== undefined && exHyperlinkIdRef !== 0) {
        // Look for the following TxInteractiveInfoAtom
        const nextIdx = i + 1;
        if (nextIdx < textboxChildren.length && textboxChildren[nextIdx].recType === RT.TxInteractiveInfoAtom) {
          const txRec = textboxChildren[nextIdx];
          if (txRec.data.byteLength >= 8) {
            const txView = new DataView(txRec.data.buffer, txRec.data.byteOffset, txRec.data.byteLength);
            const begin = txView.getUint32(0, true);
            const end = txView.getUint32(4, true);
            ranges.push({ begin, end, exHyperlinkIdRef });
          }
          i = nextIdx + 1;
          continue;
        }
      }
    }

    i++;
  }

  return ranges.sort((a, b) => a.begin - b.begin);
}

function decodeUtf16Le(data: Uint8Array): string {
  const chars: string[] = [];
  for (let i = 0; i + 1 < data.length; i += 2) {
    const code = data[i] | (data[i + 1] << 8);
    if (code === 0) break;
    chars.push(String.fromCharCode(code));
  }
  return chars.join("");
}
