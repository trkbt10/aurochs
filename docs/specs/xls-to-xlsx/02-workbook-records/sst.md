# SST Record (0x00FC)

## Overview
- Purpose: 共有文字列テーブル（Shared String Table）を格納
- Location: Workbook globals
- XLSX Mapping: `XlsxWorkbook.sharedStrings`

## Binary Structure (BIFF8)

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x00FC |
| 2 | 2 | length | Variable |
| 4 | 4 | cstTotal | 総文字列数（拡張テーブル含む） |
| 8 | 4 | cstUnique | ユニーク文字列数 |
| 12 | var | rgb | Unicode文字列の配列 |

### Unicode String Structure

各文字列は以下の構造:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | cch | 文字数（バイト数ではない） |
| 2 | 1 | grbit | Option flags |
| 3 | var | rgb | 文字列データ |

### grbit Flags

| Bit | Mask | Name | Description |
|-----|------|------|-------------|
| 0 | 0x01 | fHighByte | 0=compressed (1byte/char), 1=uncompressed (2bytes/char) |
| 2 | 0x04 | fExtSt | Extended string |
| 3 | 0x08 | fRichSt | Rich string (formatting runs) |

### CONTINUE Records

SSTは大きくなる可能性があり、8224バイトを超える場合はCONTINUE（0x003C）で分割される。
文字列の途中でCONTINUEが入る場合の処理が必要。

CONTINUE が「文字列データの続き」を含む場合、payload 先頭に 1 byte のフラグが入る:
- `0`: compressed unicode string
- `1`: uncompressed unicode string

## Parser Implementation

### Input
- `Uint8Array`: SSTレコードのデータ部分（cstTotal から開始）
- `Uint8Array[]`: 後続の CONTINUE レコード payload（境界情報が必要なため分割で受け取る）

### Output
```typescript
type SstRecord = {
  totalCount: number;
  uniqueCount: number;
  strings: string[];
};
```

### Parse Logic

1. オフセット0から4バイトでcstTotalを読む
2. オフセット4から4バイトでcstUniqueを読む
3. オフセット8から各Unicode文字列を順次読む
4. cstUnique個の文字列を収集

```typescript
// src/xls/biff/records/sst.ts
function parseSstRecord(data: Uint8Array, continues: Uint8Array[]): SstRecord;
```

### Unicode String Parsing

```typescript
function parseUnicodeString(data: Uint8Array): { value: string; bytesRead: number } {
  const view = new DataView(data.buffer, data.byteOffset);
  const cch = view.getUint16(0, true);  // Character count
  const grbit = data[2];

  const fHighByte = (grbit & 0x01) !== 0;
  const fExtSt = (grbit & 0x04) !== 0;
  const fRichSt = (grbit & 0x08) !== 0;

  let offset = 3;

  // Rich string formatting runs
  let cRun = 0;
  if (fRichSt) {
    cRun = view.getUint16(offset, true);
    offset += 2;
  }

  // Extended string data size
  let cbExtRst = 0;
  if (fExtSt) {
    cbExtRst = view.getUint32(offset, true);
    offset += 4;
  }

  // String data
  let value: string;
  if (fHighByte) {
    // Uncompressed: 2 bytes per character (UTF-16LE)
    const bytes = data.slice(offset, offset + cch * 2);
    value = new TextDecoder("utf-16le").decode(bytes);
    offset += cch * 2;
  } else {
    // Compressed: 1 byte per character (Latin-1)
    const bytes = data.slice(offset, offset + cch);
    value = new TextDecoder("latin1").decode(bytes);
    offset += cch;
  }

  // Skip formatting runs
  offset += cRun * 4;

  // Skip extended data
  offset += cbExtRst;

  return { value, bytesRead: offset };
}
```

## XLSX Mapping

### Target Types
- `XlsxWorkbook.sharedStrings: readonly string[]`

### Mapping Rules
- SST.strings → XlsxWorkbook.sharedStrings
- 順序を維持（インデックスでLABELSSTから参照される）

## Test Cases

### Test XLS Generation
このリポジトリでは外部の XLS writer（例: SheetJS）は使わず、`scripts/generate-xls-fixtures/` の最小ジェネレータで `.xls` を生成する。

```bash
bun run scripts/generate-xls-fixtures/index.ts
```

生成物（SST を含む）:
- `spec/xls-fixtures/minimal.xls`（`["Hello"]`）
- `spec/xls-fixtures/all-features.xls`（空文字列 / 日本語 / 複数エントリを含む）

### Expected Result
```typescript
const sst = parseSstRecord(sstData);
expect(sst.strings).toContain("Hello");
expect(sst.strings).toContain("World");
expect(sst.strings).toContain("日本語");
// "Hello" should appear only once (shared)
expect(sst.strings.filter(s => s === "Hello").length).toBe(1);
```

### Edge Cases
- [x] 空の文字列
- [x] 非常に長い文字列（CONTINUEレコード跨ぎ）
- [x] 日本語/CJK文字
- [x] 絵文字/サロゲートペア
- [x] Rich text（書式付き文字列）
- [x] Extended string data

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete
