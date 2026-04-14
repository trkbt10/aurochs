/**
 * @file Generate XLSX fixture files from DSV data for manual verification.
 *
 * Produces XLSX files that can be opened in Microsoft Excel / LibreOffice Calc
 * to visually verify that the DSV → XLSX conversion produces valid workbooks.
 *
 * Usage:
 *   bun run packages/@aurochs-converters/interop-dsv-xlsx/scripts/generate-fixtures.ts
 *
 * Output:
 *   packages/@aurochs-converters/interop-dsv-xlsx/tmp/fixtures/*.xlsx
 */

import { parseDsv } from "@aurochs/dsv";
import { convertDsvToXlsx } from "../src/dsv-to-xlsx";
import { convertXlsxToDsv } from "../src/xlsx-to-dsv";
import { buildDsv } from "@aurochs/dsv";
import { exportXlsx } from "@aurochs-builder/xlsx";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Output directory
// =============================================================================

const SCRIPT_DIR = import.meta.dirname;
const OUT_DIR = join(SCRIPT_DIR, "..", "tmp", "fixtures");
mkdirSync(OUT_DIR, { recursive: true });

// =============================================================================
// Fixture definitions
// =============================================================================

type Fixture = {
  readonly name: string;
  readonly description: string;
  readonly csv: string;
  readonly hasHeaders: boolean;
  readonly sheetName?: string;
  readonly respectQuoting?: boolean;
};

const FIXTURES: readonly Fixture[] = [
  // ─── Basic ───────────────────────────────────────────────
  {
    name: "01-basic-types",
    description: "Basic type inference: string, integer, decimal, boolean",
    hasHeaders: true,
    csv: [
      "name,age,score,active",
      "Alice,30,95.5,true",
      "Bob,25,87.3,false",
      "Charlie,35,100,true",
    ].join("\r\n") + "\r\n",
  },

  // ─── Dates ───────────────────────────────────────────────
  {
    name: "02-dates",
    description: "ISO 8601 date and datetime values",
    hasHeaders: true,
    csv: [
      "event,date,timestamp",
      "Launch,2024-01-15,2024-01-15T09:30:00Z",
      "Release,2024-06-01,2024-06-01T14:00:00Z",
      "EOL,2025-12-31,2025-12-31T23:59:59Z",
    ].join("\r\n") + "\r\n",
  },

  // ─── Empty / Null ────────────────────────────────────────
  {
    name: "03-empty-and-null",
    description: "Empty fields, missing values, whitespace-only",
    hasHeaders: true,
    csv: [
      "id,value,note",
      "1,,first is empty",
      "2,hello,",
      "3,,",
      "4,world,has value",
    ].join("\r\n") + "\r\n",
  },

  // ─── Quoted strings ──────────────────────────────────────
  {
    name: "04-quoted-strings",
    description: "Quoted fields that look like numbers or booleans (respectQuoting=true)",
    hasHeaders: true,
    csv: [
      'zip,phone,flag,code',
      '"00501","0312345678","true","007"',
      '"10001","0398765432","false","042"',
    ].join("\r\n") + "\r\n",
  },

  // ─── Special characters ──────────────────────────────────
  {
    name: "05-special-chars",
    description: "Fields with commas, quotes, newlines, unicode",
    hasHeaders: true,
    csv: [
      'label,description,emoji',
      '"Item, A","Contains a ""quote""",🎉',
      '"Line\nBreak","Tab\there",日本語テスト',
      'Normal,Plain text,Ξ±Ξ²Ξ³',
    ].join("\r\n") + "\r\n",
  },

  // ─── Large numbers ───────────────────────────────────────
  {
    name: "06-large-numbers",
    description: "Large integers, negative, zero, scientific-notation-like",
    hasHeaders: true,
    csv: [
      "description,value",
      "Large positive,999999999999",
      "Large negative,-999999999999",
      "Zero,0",
      "Small decimal,0.001",
      "Negative decimal,-3.14159",
      "Leading zero integer,0",
    ].join("\r\n") + "\r\n",
  },

  // ─── No headers ──────────────────────────────────────────
  {
    name: "07-no-headers",
    description: "Data without header row",
    hasHeaders: false,
    csv: [
      "Alice,30,true",
      "Bob,25,false",
      "Charlie,35,true",
    ].join("\r\n") + "\r\n",
  },

  // ─── Single cell ─────────────────────────────────────────
  {
    name: "08-single-cell",
    description: "Minimal: one header, one value",
    hasHeaders: true,
    csv: "value\r\n42\r\n",
  },

  // ─── Many columns ────────────────────────────────────────
  {
    name: "09-many-columns",
    description: "26 columns (A-Z) to verify wide spreadsheets",
    hasHeaders: true,
    csv: (() => {
      const headers = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
      const row1 = Array.from({ length: 26 }, (_, i) => String(i + 1));
      const row2 = Array.from({ length: 26 }, (_, i) => String((i + 1) * 10));
      return [headers.join(","), row1.join(","), row2.join(",")].join("\r\n") + "\r\n";
    })(),
  },

  // ─── Mixed types in one column ───────────────────────────
  {
    name: "10-mixed-column",
    description: "A column with mixed types (string dominant) — all become strings",
    hasHeaders: true,
    csv: [
      "mixed",
      "hello",
      "42",
      "true",
      "2024-01-01",
      "",
      "world",
    ].join("\r\n") + "\r\n",
  },

  // ─── Boolean column with varied casing ───────────────────
  {
    name: "11-boolean-casing",
    description: "Boolean values with various casings",
    hasHeaders: true,
    csv: [
      "flag",
      "true",
      "false",
      "TRUE",
      "FALSE",
      "True",
      "False",
    ].join("\r\n") + "\r\n",
  },

  // ─── respectQuoting=false ────────────────────────────────
  {
    name: "12-no-respect-quoting",
    description: "Quoted numbers treated as numbers (respectQuoting=false)",
    hasHeaders: true,
    respectQuoting: false,
    csv: [
      'label,value',
      '"num","42"',
      '"pi","3.14"',
      '"negative","-7"',
    ].join("\r\n") + "\r\n",
  },

  // ─── Empty document ──────────────────────────────────────
  {
    name: "13-headers-only",
    description: "Headers with no data rows",
    hasHeaders: true,
    csv: "col_a,col_b,col_c\r\n",
  },

  // ─── Many rows ───────────────────────────────────────────
  {
    name: "14-many-rows",
    description: "1000 rows to verify larger datasets",
    hasHeaders: true,
    csv: (() => {
      const lines = ["id,name,value"];
      for (let i = 1; i <= 1000; i++) {
        lines.push(`${i},Item ${i},${(i * 1.5).toFixed(2)}`);
      }
      return lines.join("\r\n") + "\r\n";
    })(),
  },
];

// =============================================================================
// Generation
// =============================================================================

async function generateFixture(fixture: Fixture): Promise<void> {
  const dialectOpt = fixture.hasHeaders ? {} : { dialect: { hasHeader: false } as const };
  const doc = parseDsv(fixture.csv, dialectOpt);

  // DSV → XLSX
  const convertResult = convertDsvToXlsx(doc, {
    sheetName: fixture.sheetName ?? "Data",
    respectQuoting: fixture.respectQuoting,
  });

  if (convertResult.warnings && convertResult.warnings.length > 0) {
    console.log(`  ⚠ Warnings: ${convertResult.warnings.map((w) => w.message).join("; ")}`);
  }

  // Export to binary XLSX
  const xlsxBytes = await exportXlsx(convertResult.data);

  // Write file
  const outPath = join(OUT_DIR, `${fixture.name}.xlsx`);
  writeFileSync(outPath, xlsxBytes);

  // Round-trip verification: XLSX → DSV → text
  const roundTrip = convertXlsxToDsv(convertResult.data, {
    firstRowAsHeaders: fixture.hasHeaders,
  });
  const roundTripCsv = buildDsv(roundTrip.data);

  // Report
  const recordCount = doc.records.length;
  const headerCount = doc.headers?.length ?? 0;
  const xlsxSize = xlsxBytes.byteLength;
  console.log(
    `  ✓ ${fixture.name}.xlsx  (${headerCount} cols, ${recordCount} rows, ${xlsxSize} bytes)`,
  );

  // Write round-trip CSV for comparison
  const csvOutPath = join(OUT_DIR, `${fixture.name}.roundtrip.csv`);
  writeFileSync(csvOutPath, roundTripCsv);
}

async function main(): Promise<void> {
  console.log(`Generating ${FIXTURES.length} fixture XLSX files in ${OUT_DIR}\n`);

  for (const fixture of FIXTURES) {
    console.log(`[${fixture.name}] ${fixture.description}`);
    await generateFixture(fixture);
  }

  console.log(`\nDone. Open the .xlsx files in Microsoft Excel to verify.`);
  console.log(`Round-trip .csv files are also written for diff comparison.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
