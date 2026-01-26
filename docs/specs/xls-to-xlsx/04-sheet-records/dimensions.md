# DIMENSIONS Record (0x0200)

## Overview
- Purpose: シートのセルテーブルの最小・最大境界を格納
- Location: Sheet substream
- XLSX Mapping: `XlsxWorksheet.dimension` (CellRange)

## Binary Structure (BIFF8)

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x0200 |
| 2 | 2 | length | 14 (0x000E) |
| 4 | 4 | rwMic | First defined row (0-based) |
| 8 | 4 | rwMac | Last defined row + 1 |
| 12 | 2 | colMic | First defined column (0-based) |
| 14 | 2 | colMac | Last defined column + 1 |
| 16 | 2 | (Reserved) | 未使用 |

### 境界値の解釈

`rwMac` と `colMac` は実際の最終行/列より1大きい値。

例: セル B3:D6 を含むシート
- rwMic = 2 (row 3, 0-based)
- rwMac = 6 (row 6の次)
- colMic = 1 (column B, 0-based)
- colMac = 4 (column Dの次)

実際の範囲: B3:D6

## Parser Implementation

### Input
- `Uint8Array`: DIMENSIONSレコードのデータ部分（14バイト）

### Output
```typescript
type DimensionsRecord = {
  firstRow: number;    // 0-based
  lastRowExclusive: number;     // 0-based (exclusive)
  firstCol: number;    // 0-based
  lastColExclusive: number;     // 0-based (exclusive)
};
```

### Parse Logic

1. オフセット0から4バイトで最初の行を読む
2. オフセット4から4バイトで最後の行+1を読む
3. オフセット8から2バイトで最初の列を読む
4. オフセット10から2バイトで最後の列+1を読む
5. rwMac と colMac から1を引いて実際の最終位置を計算

```typescript
// src/xls/biff/records/dimensions.ts
function parseDimensionsRecord(data: Uint8Array): DimensionsRecord {
  const view = new DataView(data.buffer, data.byteOffset);

  const rwMic = view.getUint32(0, true);
  const rwMac = view.getUint32(4, true);
  const colMic = view.getUint16(8, true);
  const colMac = view.getUint16(10, true);

  return {
    firstRow: rwMic,
    lastRowExclusive: rwMac,
    firstCol: colMic,
    lastColExclusive: colMac,
  };
}
```

## XLSX Mapping

### Target Types
- `CellRange` - `src/xlsx/domain/cell/address.ts`
- `XlsxWorksheet.dimension` - `src/xlsx/domain/workbook.ts`

### Mapping Rules
- XLS rows/cols (0-based) → XLSX rows/cols (1-based)
- `firstRow + 1` → `CellRange.startRow`
- `lastRowExclusive` → `CellRange.endRow = lastRowExclusive`（0-based の exclusive を 1-based にすると、そのまま inclusive end になる）
- `firstCol + 1` → `CellRange.startCol`
- `lastColExclusive` → `CellRange.endCol = lastColExclusive`（0-based の exclusive を 1-based にすると、そのまま inclusive end になる）

```typescript
function dimensionsToXlsx(dim: DimensionsRecord): CellRange {
  return {
    startRow: dim.firstRow + 1,
    endRow: dim.lastRowExclusive,
    startCol: dim.firstCol + 1,
    endCol: dim.lastColExclusive,
  };
}
```

### Empty Sheet
空のシートの場合:
- rwMic = rwMac = colMic = colMac = 0
- dimension は `undefined` として扱う

## Test Cases

### Test XLS Generation
このリポジトリでは外部の XLS writer（例: SheetJS）は使わず、`scripts/generate-xls-fixtures/` の最小ジェネレータで `.xls` を生成する。

```bash
bun run scripts/generate-xls-fixtures/index.ts
```

生成物（DIMENSIONS を含む）:
- `spec/xls-fixtures/minimal.xls`（1セルのみ）
- `spec/xls-fixtures/all-features.xls`（複数列/複数行）

### Expected Result
```typescript
const dim = parseDimensionsRecord(dimensionsData);
expect(dim.firstRow).toBe(2);   // Row 3, 0-based
expect(dim.lastRowExclusive).toBe(6);    // Row 6 + 1, 0-based
expect(dim.firstCol).toBe(1);   // Column B, 0-based
expect(dim.lastColExclusive).toBe(4);    // Column D + 1, 0-based

// XLSX mapping
const range = dimensionsToXlsx(dim);
expect(range).toEqual({
  startRow: 3, endRow: 6,
  startCol: 2, endCol: 4,
});
```

### Edge Cases
- [x] 空のシート（dimension なし）
- [x] 1セルのみのシート
- [x] 最大行/列境界（65536行, 256列）
- [x] 先頭行/列のみにデータ

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete
