# LABELSST Record (0x00FD)

## Overview
- Purpose: SST（共有文字列テーブル）を参照する文字列セルを表現
- Location: Sheet substream
- XLSX Mapping: `Cell` with `StringCellValue`

BIFF8では文字列は直接セルに格納されず、SSTへのインデックスとして格納される。

## Binary Structure

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x00FD |
| 2 | 2 | length | 10 (0x000A) |
| 4 | 2 | rw | Row number (0-based) |
| 6 | 2 | col | Column number (0-based) |
| 8 | 2 | ixfe | Index to XF record |
| 10 | 4 | isst | Index into SST record |

## Parser Implementation

### Input
- `Uint8Array`: LABELSSTレコードのデータ部分（10バイト）

### Output
```typescript
type LabelSstRecord = {
  row: number;      // 0-based
  col: number;      // 0-based
  xfIndex: number;  // XF record index
  sstIndex: number; // Index into SST
};
```

### Parse Logic

```typescript
// src/xls/biff/records/labelsst.ts
function parseLabelSstRecord(data: Uint8Array): LabelSstRecord {
  const view = new DataView(data.buffer, data.byteOffset);

  return {
    row: view.getUint16(0, true),
    col: view.getUint16(2, true),
    xfIndex: view.getUint16(4, true),
    sstIndex: view.getUint32(6, true),
  };
}
```

## XLSX Mapping

### Target Types
- `Cell` - `src/xlsx/domain/cell/types.ts`
- `StringCellValue` - `src/xlsx/domain/cell/types.ts`

### Mapping Rules

SSTの解決が必要:
1. `sstIndex` でSSTから実際の文字列を取得
2. 文字列を `StringCellValue` に格納

```typescript
function labelSstRecordToCell(rec: LabelSstRecord, sst: string[]): Cell {
  const value = sst[rec.sstIndex];
  if (value === undefined) {
    throw new Error(`Invalid SST index: ${rec.sstIndex}`);
  }

  return {
    address: {
      row: rec.row + 1,
      col: rec.col + 1,
      rowAbsolute: false,
      colAbsolute: false,
    },
    value: {
      type: "string",
      value,
    },
    styleId: rec.xfIndex as StyleId,
  };
}
```

## XLSX Output

XLSXでも共有文字列テーブルを使用するため、SSTのインデックスをそのまま利用可能。
ただし、XLSXの共有文字列テーブルは再構築される場合がある。

## Test Cases

### Test XLS Generation
このリポジトリでは外部の XLS writer（例: SheetJS）は使わず、`scripts/generate-xls-fixtures/` の最小ジェネレータで `.xls` を生成する。

```bash
bun run scripts/generate-xls-fixtures/index.ts
```

生成物（LABELSST を含む）:
- `spec/xls-fixtures/minimal.xls`（A1 に "Hello"）
- `spec/xls-fixtures/all-features.xls`（Sheet1: A2 に "Hello"）

### Expected Result
```typescript
// SST must be parsed first
const sst = parseSstRecord(sstData);

const label = parseLabelSstRecord(labelData);
const cell = labelSstRecordToCell(label, sst.strings);
expect(cell.value).toEqual({ type: "string", value: "Hello" });
```

### Edge Cases
- [x] 空文字列
- [x] SSTの最後のエントリを参照
- [x] 日本語文字列
- [x] 非常に長い文字列

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete
