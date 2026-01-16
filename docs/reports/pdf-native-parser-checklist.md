# Native PDF Parser — Remaining Implementation Checklist

Status: `pdf-lib` removed repo-wide (runtime/tests/scripts). Native loader + parser are the only implementation path.

This checklist tracks remaining gaps/risks in the native PDF implementation under `src/pdf/native/` and the PDF→domain conversion pipeline under `src/pdf/parser/` / `src/pdf/converter/`.

Definition of “done” for a checkbox:
- A test exists (unit: co-located `*.spec.ts` under `src/pdf/**`, or integration: `spec/**`)
- The test covers at least one real input (checked-in fixture PDF or a deterministic in-test constructed PDF)

## 0) P0 correctness blockers (highest priority)

- [x] **Stream `/Length` handling is exact** (`src/pdf/native/object-parser.ts`)
  - [x] handle indirect `/Length` safely (avoid naive `endstream` scan where possible)
  - [x] ensure parsing can’t be confused by binary payloads containing the byte sequence `endstream`
- [x] **XRef/ObjStm decode parms are honored** (currently some decodes ignore `/DecodeParms`)
  - [x] xref stream: pass `/DecodeParms` to `decodeStreamData()` when present (`src/pdf/native/xref.ts`)
  - [x] ObjStm: pass `/DecodeParms` to `decodeStreamData()` when present (`src/pdf/native/resolver.ts`)
- [x] **Hybrid-reference PDFs are handled or rejected explicitly**
  - [x] support trailer `/XRefStm` (xref table + xref stream hybrid) (`src/pdf/native/xref.ts`)

## 1) Cross-reference / object loading

- [x] **Incremental updates**: verify `/Prev` chaining works for:
  - [x] xref stream → xref stream (`src/pdf/native/xref.spec.ts`)
  - [x] xref table → xref table (`src/pdf/native/xref.spec.ts`)
  - [x] mixed xref stream ↔ table (`src/pdf/native/xref.spec.ts`)
- [x] **Object streams**:
  - [x] validate `/ObjStm` parsing against multiple object stream layouts (header spacing/newlines) (`src/pdf/native/resolver.spec.ts`)
  - [x] confirm behavior when referenced object is missing from `/ObjStm` body (`src/pdf/native/resolver.spec.ts`)

## 2) Tokenizer / object parser robustness

- [x] **String encodings**
  - [x] UTF-16 with BOM decoding for PDF strings (`src/pdf/native/encoding.ts`, `src/pdf/native/object-parser.ts`)
  - [x] PDFDocEncoding fallback (strings without BOM are not necessarily Latin-1; affects `/Info`, many text tokens) (`src/pdf/native/encoding.ts`)
- [x] **Hex string rules** (`src/pdf/native/lexer.ts`)
  - [x] confirm behavior matches ISO 32000 (whitespace handling, odd nibble count, and whether to reject non-hex garbage) (`src/pdf/native/lexer.spec.ts`)
- [x] **Edge syntax**
  - [x] tolerate uncommon whitespace/comment placements (around `obj`, `stream`, `endobj`) (`src/pdf/native/object-parser.spec.ts`)

## 3) Stream filters (generic decode)

Implemented in `src/pdf/native/filters/`: `FlateDecode`, `LZWDecode`, `ASCII85Decode`, `ASCIIHexDecode`, `RunLengthDecode`; passthrough: `DCTDecode`, `JPXDecode`.

- [x] **LZWDecode** (common in older PDFs) (`src/pdf/native/filters/lzw.ts`)
- [x] **DecodeParms support beyond LZW**
  - [x] Flate predictors where applicable (rare outside images, but possible in xref/streams) (`src/pdf/native/filters/flate.ts`)
  - [x] `Columns`, `Colors`, `BitsPerComponent` usage (where relevant) (`src/pdf/native/filters/flate.ts`)
- [x] **Crypt filter** (supported as a no-op after object-level decryption; enables `/Filter [/Crypt ...]`) (`src/pdf/native/filters/index.ts`, `src/pdf/native/filters/crypt.spec.ts`)

## 4) Encryption support

Current behavior: reject when trailer has `/Encrypt` unless caller chooses “ignore” or provides an explicit password (`src/pdf/native/document.ts`, `src/pdf/parser/native-load.ts`).

- [ ] **Explicit encryption model**
  - [x] Standard Security Handler (RC4 40-bit; `V=1`, `R=2`) with explicit password injection (`src/pdf/native/encryption/standard.ts`, `src/pdf/parser/native-load.spec.ts`)
  - [x] keep `password` mode behavior explicit (requires `encryption: { mode: "password", password }`) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/native-load.ts`)
  - [x] Standard Security Handler RC4 128-bit (`V=2`, `R=3`) (`src/pdf/native/encryption/standard.ts`, `src/pdf/native/encryption/standard.spec.ts`)
  - [ ] Standard Security Handler AES (`V=4/5`) / Crypt filters
- [ ] **Crypt filter integration** (depends on decryption support)

## 5) Document / page model completeness

Current behavior: collects pages, supports inherited `Resources` and `MediaBox` (`src/pdf/native/document.ts`).

- [x] **Additional boxes** (and inheritance rules)
  - [x] `CropBox` (`src/pdf/native/document.ts`, `src/pdf/native/document.spec.ts`)
  - [x] `BleedBox` (`src/pdf/native/document.ts`, `src/pdf/native/document.spec.ts`)
  - [x] `TrimBox` (`src/pdf/native/document.ts`, `src/pdf/native/document.spec.ts`)
  - [x] `ArtBox` (`src/pdf/native/document.ts`, `src/pdf/native/document.spec.ts`)
- [x] **Rotation and scaling**: page `/Rotate`, `/UserUnit` (`src/pdf/native/document.ts`, `src/pdf/native/document.spec.ts`)

## 6) Content stream operator coverage (PDF → domain)

- [ ] **Graphics model**
  - [ ] Patterns/Shadings (currently `Pattern` falls back to black in conversion) (`src/pdf/converter/color-converter.ts`)
  - [ ] transparency groups / soft masks (impacts image/text appearance)
    - [x] ExtGState alpha (`gs` + `/ca` `/CA`) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`)
  - [ ] complex transforms (shear/rotation matrix edge cases; currently warns/fallbacks) (`src/pdf/converter/transform-converter.ts`)
- [ ] **Text model**
  - [ ] Type3 font handling (charprocs, widths, resources)
    - [x] Type3 `/Widths` scaled by `/FontMatrix` for correct text advance (`src/pdf/parser/font-decoder.native.ts`, `src/pdf/parser/font-decoder.native.spec.ts`)
  - [x] robust fallback when `ToUnicode` is missing/partial (beyond current CID fallback maps) (`src/pdf/domain/font/text-decoder.ts`, `src/pdf/domain/font/text-decoder.spec.ts`)

## 7) Image extraction coverage

Current behavior in `src/pdf/parser/image-extractor.native.ts`: supports common XObject images, Flate predictors, and CCITT (via `ccitt-fax-decode.ts`) with “fail closed” on unsupported DecodeParms.

- [ ] **Additional filters**
  - [x] `LZWDecode` images (generic filters are now present; ensure extraction path uses them as needed) (`src/pdf/parser/image-extractor.spec.ts`)
  - [x] `DCTDecode` → decode to pixel bytes when required by output format (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [ ] `JPXDecode` → decode to pixel bytes when required by output format
- [ ] **Color spaces / masks**
  - [ ] ICCBased: parse ICC profiles (currently infers by component count; warns on unusual cases) (`src/pdf/converter/color-converter.ts`, `src/pdf/converter/pixel-converter.ts`)
  - [x] `SMask` / soft-mask alpha handling (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
  - [x] DeviceCMYK end-to-end correctness validation (`src/pdf/parser/image-extractor.spec.ts`)
- [ ] **CCITT completeness** (`src/pdf/parser/ccitt-fax-decode.ts`)
  - [x] Group 3 mixed 1D/2D (K > 0) (`src/pdf/parser/ccitt-fax-decode.ts`, `src/pdf/parser/ccitt-fax-decode.spec.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `EndOfLine=true` and `DamagedRowsBeforeError` handling (accepted as no-ops for Group4 /K=-1) (`src/pdf/parser/ccitt-fax-decode.ts`, `src/pdf/parser/image-extractor.spec.ts`)

## 8) Metadata extraction

Current behavior: `Info` uses `PdfString.text` which is BOM-aware, otherwise Latin-1 (`src/pdf/native/document.ts`, `src/pdf/native/encoding.ts`).

- [x] **Info string encoding**: PDFDocEncoding fallback for common metadata fields (Title/Author/Subject) (`src/pdf/native/encoding.ts`)
- [x] **XMP metadata**: parse `/Metadata` stream (XML) (`src/pdf/native/xmp.ts`, `src/pdf/native/xmp.spec.ts`)

## 9) Fixtures / sample PDFs (for building coverage)

- [x] **CLI-generated PDFs (famous library)**
  - [x] add a deterministic generator script (bun CLI) that produces a small set of PDFs for tests (text, images, multi-page, etc.) (`scripts/generate-pdfkit-fixtures.ts`)
  - [x] add an integration spec that asserts generator output matches checked-in fixtures byte-for-byte (`spec/integration/pdfkit-fixtures.spec.ts`)
- [x] **Hand-crafted “evil” PDFs** (small, deterministic inputs in tests)
  - [x] indirect `/Length` + stream data that contains `endstream` (`src/pdf/native/object-parser.spec.ts`)
  - [x] incremental update (`/Prev`) cases (`src/pdf/native/xref.spec.ts`)
  - [x] hybrid-reference (`/XRefStm`) case (or explicit rejection) (`src/pdf/native/xref.spec.ts`)

## 10) Validation matrix (what to test as work proceeds)

- [ ] Add fixtures/tests per missing feature (prefer co-located `*.spec.ts` in `src/pdf/**`).
- [ ] Regression tests for:
  - [x] LZWDecode streams (`src/pdf/native/filters/lzw.spec.ts`)
  - [x] indirect `/Length` streams with binary payloads containing `endstream` (`src/pdf/native/object-parser.spec.ts`)
  - [x] PDFs with `/Rotate` and `CropBox` (`src/pdf/native/document.spec.ts`)
  - [x] encrypted PDF classification behavior (reject vs ignore) (`src/pdf/parser/native-load.spec.ts`)

## 11) Operational checks

- [ ] Performance: large PDFs (page count, ObjStm-heavy, large image streams)
- [ ] Memory: avoid full-document decoding where possible; keep caching bounded
