/**
 * @file Round-trip tests: DSV → XLSX → DSV
 *
 * These tests verify that converting a DSV document to XLSX and back
 * produces semantically equivalent output. Note that exact round-trip
 * fidelity is not always possible:
 *
 * - Quoting information is lost (XLSX doesn't track quoting)
 * - Date fields become ISO 8601 strings (not the original "2024-01-15")
 *   because XLSX stores dates as serial numbers and back-conversion
 *   produces ISO format
 * - Number formatting may differ (e.g., "3.0" becomes "3")
 */
import { parseDsv, buildDsv } from "@aurochs/dsv";
import { convertDsvToXlsx } from "./dsv-to-xlsx";
import { convertXlsxToDsv } from "./xlsx-to-dsv";

describe("round-trip DSV → XLSX → DSV", () => {
  it("preserves string and number data", () => {
    const originalCsv = "name,score\r\nAlice,95\r\nBob,87\r\n";
    const doc = parseDsv(originalCsv, {});

    // DSV → XLSX
    const xlsxResult = convertDsvToXlsx(doc);
    expect(xlsxResult.warnings).toBeUndefined();

    // XLSX → DSV
    const dsvResult = convertXlsxToDsv(xlsxResult.data);
    expect(dsvResult.warnings).toBeUndefined();

    // Build CSV back
    const roundTripped = buildDsv(dsvResult.data);
    expect(roundTripped).toBe(originalCsv);
  });

  it("preserves boolean data", () => {
    const doc = parseDsv("flag\r\ntrue\r\nfalse\r\n", {});

    const xlsxResult = convertDsvToXlsx(doc);
    const dsvResult = convertXlsxToDsv(xlsxResult.data);
    const csv = buildDsv(dsvResult.data);

    expect(csv).toBe("flag\r\ntrue\r\nfalse\r\n");
  });

  it("preserves empty fields", () => {
    const doc = parseDsv("a,b,c\r\n1,,3\r\n", {});

    const xlsxResult = convertDsvToXlsx(doc);
    const dsvResult = convertXlsxToDsv(xlsxResult.data);
    const csv = buildDsv(dsvResult.data);

    expect(csv).toBe("a,b,c\r\n1,,3\r\n");
  });

  it("preserves headers across the round-trip", () => {
    const doc = parseDsv("col_a,col_b,col_c\r\n1,2,3\r\n", {});

    const xlsxResult = convertDsvToXlsx(doc);
    const dsvResult = convertXlsxToDsv(xlsxResult.data);

    expect(dsvResult.data.headers).toEqual(["col_a", "col_b", "col_c"]);
  });

  it("preserves date fields as ISO 8601 dates", () => {
    const doc = parseDsv("date\r\n2024-01-15\r\n", {});

    const xlsxResult = convertDsvToXlsx(doc);
    const dsvResult = convertXlsxToDsv(xlsxResult.data);

    // Date round-trips through serial number → ISO date string
    expect(dsvResult.data.records[0].fields[0].value).toBe("2024-01-15");
  });

  it("handles mixed-type columns", () => {
    // A column with both string and number values: column is inferred as "string"
    const doc = parseDsv("val\r\nhello\r\n42\r\nworld\r\n", {});

    const xlsxResult = convertDsvToXlsx(doc);
    const dsvResult = convertXlsxToDsv(xlsxResult.data);
    const csv = buildDsv(dsvResult.data);

    expect(csv).toBe("val\r\nhello\r\n42\r\nworld\r\n");
  });

  it("handles headerless data across the round-trip", () => {
    const doc = parseDsv("Alice,30\r\nBob,25\r\n", { dialect: { hasHeader: false } });

    const xlsxResult = convertDsvToXlsx(doc);
    const dsvResult = convertXlsxToDsv(xlsxResult.data, { firstRowAsHeaders: false });
    const csv = buildDsv(dsvResult.data);

    // Column is mixed (string + integer), so all values treated as strings
    expect(csv).toBe("Alice,30\r\nBob,25\r\n");
  });
});
