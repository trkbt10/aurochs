/**
 * @file Reproduces the issue's minimal repro: 1 cell + 1 image, no merges, no
 * styles beyond defaults — and writes the result to `repro.xlsx`.
 *
 * Runs against the in-tree builder (`@aurochs-builder/xlsx`), so the file
 * produced here uses the fixed `<drawing>` element ordering that satisfies
 * Excel's strict OOXML validator (ECMA-376 §18.3.1.99 CT_Worksheet sequence:
 * `<drawing>` after `<rowBreaks>`/`<colBreaks>`).
 *
 * Usage:
 *   bun scripts/repro-xlsx-drawing-fix.ts [output.xlsx]
 *
 * Default output path is `./repro.xlsx`.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { exportXlsx, type MediaPart } from "@aurochs-builder/xlsx";
import type { XlsxWorkbookInput } from "@aurochs-builder/xlsx/builder-types";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx, sheetId } from "@aurochs-office/xlsx/domain/types";

// 1x1 transparent PNG (verbatim from the issue's repro)
const PNG_1X1_TRANSPARENT = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

const workbook: XlsxWorkbookInput = {
  sheets: [
    {
      name: "S",
      sheetId: sheetId(1),
      state: "visible",
      columns: [{ min: colIdx(1), max: colIdx(2), width: 20 }],
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [
            {
              address: {
                col: colIdx(1),
                row: rowIdx(1),
                colAbsolute: false,
                rowAbsolute: false,
              },
              value: { type: "number", value: 1 },
            },
          ],
        },
      ],
      mergeCells: [],
      drawing: {
        anchors: [
          {
            type: "twoCellAnchor",
            editAs: "oneCell",
            from: { col: colIdx(1), colOff: 0, row: rowIdx(1), rowOff: 0 },
            to: { col: colIdx(2), colOff: 0, row: rowIdx(5), rowOff: 0 },
            content: {
              type: "picture",
              nvPicPr: { id: 1, name: "img" },
              blipRelId: "rId1",
            },
          },
        ],
      },
    },
  ],
  styles: createDefaultStyleSheet(),
};

const media = new Map<string, MediaPart>();
media.set("rId1", { data: PNG_1X1_TRANSPARENT, contentType: "image/png" });

const sheetMedia = new Map<number, ReadonlyMap<string, MediaPart>>();
sheetMedia.set(0, media);

const outPath = resolve(process.cwd(), process.argv[2] ?? "repro.xlsx");
const data = await exportXlsx(workbook, { sheetMedia });
await writeFile(outPath, data);

console.log(`Wrote ${outPath} (${data.byteLength} bytes)`);
