# BOUNDSHEET Record (0x0085)

## Overview
- Purpose: シート名、シートタイプ、ストリーム位置を格納
- Location: Workbook globals
- XLSX Mapping: `XlsxWorksheet` の name, state, sheetId

## Binary Structure (BIFF8)

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x0085 |
| 2 | 2 | length | Variable |
| 4 | 4 | lbPlyPos | BOFレコードのストリーム位置 |
| 8 | 2 | grbit | Option flags |
| 10 | 1 | cch | シート名の文字数 |
| 11 | var | rgch | シート名（Unicode String） |

### Option Flags (grbit field)

| Bits | Mask | Name | Description |
|------|------|------|-------------|
| 1-0 | 0x0003 | hsState | Hidden state: 0x00=visible, 0x01=hidden, 0x02=veryHidden |
| 7-2 | 0x00FC | (Reserved) | - |
| 15-8 | 0xFF00 | dt | Sheet type |

### Sheet Types (dt field)

| Value | Description |
|-------|-------------|
| 0x00 | Worksheet or dialog sheet |
| 0x01 | Excel 4.0 macro sheet |
| 0x02 | Chart |
| 0x06 | Visual Basic module |

### Hidden States (hsState field)

| Value | Description |
|-------|-------------|
| 0x00 | visible - シートタブに表示される |
| 0x01 | hidden - 「表示」メニューから再表示可能 |
| 0x02 | veryHidden - VBAからのみ再表示可能 |

## Parser Implementation

### Input
- `Uint8Array`: BOUNDSHEETレコードのデータ部分

### Output
```typescript
type BoundsheetRecord = {
  streamPosition: number;  // BOFレコードの位置
  sheetType: BoundsheetType;
  hiddenState: HiddenState;
  sheetName: string;
};

type BoundsheetType =
  | "worksheet"    // 0x00
  | "macroSheet"   // 0x01
  | "chart"        // 0x02
  | "vbModule";    // 0x06

type HiddenState =
  | "visible"      // 0x00
  | "hidden"       // 0x01
  | "veryHidden";  // 0x02
```

### Parse Logic

1. オフセット0から4バイトでストリーム位置を読む（little-endian）
2. オフセット4から2バイトでオプションフラグを読む
3. hsState = grbit & 0x0003
4. dt = (grbit >> 8) & 0xFF
5. オフセット6から1バイトで文字数を読む
6. オフセット7からUnicode文字列を読む

```typescript
// src/xls/biff/records/boundsheet.ts
function parseBoundsheetRecord(data: Uint8Array): BoundsheetRecord {
  const view = new DataView(data.buffer, data.byteOffset);

  const streamPosition = view.getUint32(0, true);
  const grbit = view.getUint16(4, true);

  const hsState = grbit & 0x0003;
  const dt = (grbit >> 8) & 0xFF;

  const cch = data[6];
  const sheetName = parseUnicodeString(data.slice(7), cch);

  return {
    streamPosition,
    sheetType: mapSheetType(dt),
    hiddenState: mapHiddenState(hsState),
    sheetName,
  };
}

function mapSheetType(dt: number): BoundsheetType {
  switch (dt) {
    case 0x00: return "worksheet";
    case 0x01: return "macroSheet";
    case 0x02: return "chart";
    case 0x06: return "vbModule";
    default: throw new Error(`Unknown sheet type: ${dt}`);
  }
}

function mapHiddenState(hsState: number): HiddenState {
  switch (hsState) {
    case 0x00: return "visible";
    case 0x01: return "hidden";
    case 0x02: return "veryHidden";
    default: throw new Error(`Unknown hidden state: ${hsState}`);
  }
}
```

## XLSX Mapping

### Target Types
- `XlsxWorksheet` - `src/xlsx/domain/workbook.ts`

### Mapping Rules
- `sheetName` → `XlsxWorksheet.name`
- `hiddenState` → `XlsxWorksheet.state`:
  - "visible" → "visible"
  - "hidden" → "hidden"
  - "veryHidden" → "veryHidden"
- `streamPosition` → シートサブストリームの読み取り位置（内部使用）
- `sheetType`:
  - "worksheet" → 処理対象
  - "chart" → 現時点ではスキップ
  - "macroSheet", "vbModule" → スキップ

## Test Cases

### Test XLS Generation
このリポジトリでは外部の XLS writer（例: SheetJS）は使わず、`scripts/generate-xls-fixtures/` の最小ジェネレータで `.xls` を生成する。

```bash
bun run scripts/generate-xls-fixtures/index.ts
```

生成物（BOUNDSHEET を含む）:
- `spec/xls-fixtures/minimal.xls`（1枚の visible シート）
- `spec/xls-fixtures/all-features.xls`（2枚目が `veryHidden`）

### Expected Result
```typescript
const sheets = parseBoundsheetRecords(workbookGlobals);
expect(sheets[0].sheetName).toBe("Visible");
expect(sheets[0].hiddenState).toBe("visible");
expect(sheets[1].sheetName).toBe("Hidden");
expect(sheets[1].hiddenState).toBe("hidden");
```

### Edge Cases
- [x] 日本語シート名
- [x] 長いシート名（31文字上限）
- [x] 特殊文字を含むシート名
- [x] チャートシート
- [x] VBAモジュールシート

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete
