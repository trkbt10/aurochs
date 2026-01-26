# NUMBER Record (0x0203)

## Overview
- Purpose: 浮動小数点数を含むセルを表現
- Location: Sheet substream
- XLSX Mapping: `Cell` with `NumberCellValue`

## Binary Structure

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x0203 |
| 2 | 2 | length | 14 (0x000E) |
| 4 | 2 | rw | Row number (0-based) |
| 6 | 2 | col | Column number (0-based) |
| 8 | 2 | ixfe | Index to XF record |
| 10 | 8 | num | IEEE 754 floating-point number |

## Parser Implementation

### Input
- `Uint8Array`: NUMBERレコードのデータ部分（14バイト）

### Output
```typescript
type NumberRecord = {
  row: number;      // 0-based
  col: number;      // 0-based
  xfIndex: number;  // XF record index
  value: number;    // Floating-point value
};
```

### Parse Logic

1. オフセット0から2バイトで行番号を読む
2. オフセット2から2バイトで列番号を読む
3. オフセット4から2バイトでXFインデックスを読む
4. オフセット6から8バイトでIEEE 754浮動小数点数を読む

```typescript
// src/xls/biff/records/number.ts
function parseNumberRecord(data: Uint8Array): NumberRecord {
  const view = new DataView(data.buffer, data.byteOffset);

  return {
    row: view.getUint16(0, true),
    col: view.getUint16(2, true),
    xfIndex: view.getUint16(4, true),
    value: view.getFloat64(6, true),  // IEEE 754 little-endian
  };
}
```

## XLSX Mapping

### Target Types
- `Cell` - `src/xlsx/domain/cell/types.ts`
- `NumberCellValue` - `src/xlsx/domain/cell/types.ts`

### Mapping Rules
- `row + 1` → `Cell.address.row` (1-based)
- `col + 1` → `Cell.address.col` (1-based)
- `xfIndex` → `Cell.styleId` (StyleId)
- `value` → `NumberCellValue.value`

```typescript
function numberRecordToCell(rec: NumberRecord): Cell {
  return {
    address: {
      row: rec.row + 1,
      col: rec.col + 1,
      rowAbsolute: false,
      colAbsolute: false,
    },
    value: {
      type: "number",
      value: rec.value,
    },
    styleId: rec.xfIndex as StyleId,
  };
}
```

## Test Cases

### Test XLS Generation
このリポジトリでは外部の XLS writer（例: SheetJS）は使わず、`scripts/generate-xls-fixtures/` の最小ジェネレータで `.xls` を生成する。

```bash
bun run scripts/generate-xls-fixtures/index.ts
```

生成物（NUMBER を含む）:
- `spec/xls-fixtures/all-features.xls`

### Expected Result
```typescript
const num = parseNumberRecord(numberData);
expect(num.row).toBe(0);
expect(num.col).toBe(0);
expect(num.value).toBeCloseTo(1, 10);
```

### Edge Cases
- [x] 整数値（Excel内部でRKに変換される可能性あり）
- [x] 負の数
- [x] 非常に大きな数
- [x] 非常に小さな数（指数表記）
- [x] NaN, Infinity（通常はエラー値として扱われる）

## Note

ExcelはNUMBERレコードをRKレコードに変換することがある。
読み込み時はNUMBERを使用しても、保存時はRKになる可能性がある。

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete
