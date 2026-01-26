# BOF Record (0x0809)

## Overview
- Purpose: ストリームまたはサブストリームの開始を示すマーカー
- Location: Book stream の先頭、および各シートサブストリームの先頭
- XLSX Mapping: ワークブック/ワークシートの存在を示す（暗黙的）

## Binary Structure (BIFF8)

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x0809 |
| 2 | 2 | length | 16 (0x0010) |
| 4 | 2 | vers | BIFF version (0x0600 for BIFF8) |
| 6 | 2 | dt | Substream type |
| 8 | 2 | rupBuild | Build identifier |
| 10 | 2 | rupYear | Build year |
| 12 | 4 | bfh | File history flags |
| 16 | 4 | sfo | Lowest BIFF version |

### Substream Types (dt field)

| Value | Description |
|-------|-------------|
| 0x0005 | Workbook globals |
| 0x0006 | Visual Basic module |
| 0x0010 | Worksheet or dialog sheet |
| 0x0020 | Chart |
| 0x0040 | Excel 4.0 macro sheet |
| 0x0100 | Workspace file |

### File History Flags (bfh field)

| Bit | Description |
|-----|-------------|
| 0 | fWin (last edited on Windows) |
| 1 | fRisc (last edited on RISC platform) |
| 2 | fBeta (was ever edited by beta version) |
| 3 | fWinAny (ever edited on Windows) |
| 4 | fMacAny (ever edited on Macintosh) |
| 5 | fBetaAny (ever edited by beta version) |
| 8 | fRiscAny (ever edited on RISC platform) |

## Parser Implementation

### Input
- `Uint8Array`: BOFレコードのデータ部分（16バイト）

### Output
```typescript
type BofRecord = {
  version: number;           // BIFF version (should be 0x0600 for BIFF8)
  substreamType: BofSubstreamType;
  buildId: number;
  buildYear: number;
  fileHistoryFlags: number;
  lowestBiffVersion: number;
};

type BofSubstreamType =
  | "workbookGlobals"   // 0x0005
  | "vbModule"          // 0x0006
  | "worksheet"         // 0x0010
  | "chart"             // 0x0020
  | "macroSheet"        // 0x0040
  | "workspace";        // 0x0100
```

### Parse Logic

1. データの先頭2バイトからBIFFバージョンを読む
2. 0x0600でない場合はBIFF8ではないのでエラー（または警告）
3. オフセット2から2バイトでサブストリームタイプを読む
4. サブストリームタイプをenumにマッピング
5. 残りのフィールドを読む（buildId, buildYear, flags, lowestVersion）

```typescript
// src/xls/biff/records/bof.ts
function parseBofRecord(data: Uint8Array): BofRecord {
  const view = new DataView(data.buffer, data.byteOffset);

  const version = view.getUint16(0, true);
  if (version !== 0x0600) {
    throw new Error(`Unsupported BIFF version: ${version.toString(16)}`);
  }

  const dt = view.getUint16(2, true);
  const substreamType = mapSubstreamType(dt);

  return {
    version,
    substreamType,
    buildId: view.getUint16(4, true),
    buildYear: view.getUint16(6, true),
    fileHistoryFlags: view.getUint32(8, true),
    lowestBiffVersion: view.getUint32(12, true),
  };
}

function mapSubstreamType(dt: number): BofSubstreamType {
  switch (dt) {
    case 0x0005: return "workbookGlobals";
    case 0x0006: return "vbModule";
    case 0x0010: return "worksheet";
    case 0x0020: return "chart";
    case 0x0040: return "macroSheet";
    case 0x0100: return "workspace";
    default: throw new Error(`Unknown substream type: ${dt.toString(16)}`);
  }
}
```

## XLSX Mapping

### Target Types
- `XlsxWorkbook` - Workbook globals BOFに対応
- `XlsxWorksheet` - Worksheet BOFに対応

### Mapping Rules
- BOF(workbookGlobals) → XlsxWorkbookの存在
- BOF(worksheet) → XlsxWorksheetの存在
- BOF(chart) → チャートシート（現時点では未サポート）
- その他のBOFタイプ → スキップ

## Test Cases

### Test XLS Generation
このリポジトリでは外部の XLS writer（例: SheetJS）は使わず、`scripts/generate-xls-fixtures/` の最小ジェネレータで `.xls` を生成する。

```bash
bun run scripts/generate-xls-fixtures/index.ts
```

生成物（BOF を含む）:
- `spec/xls-fixtures/minimal.xls`（Workbook globals / Worksheet substream の BOF）
- `spec/xls-fixtures/all-features.xls`（Workbook globals / 2 Worksheet substream の BOF）

### Expected Result
```typescript
// BOFレコードの検証
const bof = parseBofRecord(bofRecordData);
expect(bof.version).toBe(0x0600);
expect(bof.substreamType).toBe("workbookGlobals");
```

### Edge Cases
- [x] BIFF8以外のバージョン（BIFF5/7）
- [x] 不明なサブストリームタイプ
- [x] 短すぎるレコードデータ

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete
