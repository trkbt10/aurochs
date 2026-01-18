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
- [x] **Operator tokenization edge cases** (`src/pdf/domain/content-stream/tokenizer.ts`)
  - [x] allow operator names containing digits (Type3 `d0`/`d1`) (`src/pdf/domain/content-stream/tokenizer.ts`, `src/pdf/domain/content-stream/tokenizer.spec.ts`)
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
    - [ ] `V=4` / `R=4` (AESV2) string/stream AES-CBC + per-object key derivation
    - [ ] `V=5` / `R=6` (AESV3) string/stream AES-CBC + UTF-8 password rules
    - [ ] `/CF` crypt filter dictionaries (`/StmF`, `/StrF`, `/EFF`) (needed for AES and some RC4 PDFs)
    - [ ] `/EncryptMetadata` handling (metadata stream encryption on/off)
- [ ] **Crypt filter integration** (depends on decryption support)
  - [x] handle `/Crypt` `/DecodeParms << /Name /Identity >>` by skipping object-level stream decryption (`src/pdf/native/encryption/decrypt-object.ts`, `src/pdf/native/filters/crypt.spec.ts`)

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
    - [ ] `/Pattern` resources: tiling patterns and shading patterns (parse + evaluate)
    - [ ] `sh` operator (shading fill) coverage (axial/radial at minimum)
    - [ ] `scn/SCN` with pattern name operand
      - [x] consume trailing pattern/separation name operand to avoid operand-stack leakage (pattern rendering still missing) (`src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/operator/color-handlers.spec.ts`)
      - [x] when only a pattern name is provided (no numeric components), set a deterministic fallback color (black) to avoid leaking a previous fill/stroke (`src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/operator/color-handlers.spec.ts`)
      - [x] when a pattern name is provided (even with numeric components for uncolored tiling patterns), ignore components and fall back to deterministic black (`src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/operator/color-handlers.spec.ts`)
  - [ ] transparency groups / soft masks (impacts image/text appearance)
    - [x] ExtGState alpha (`gs` + `/ca` `/CA`) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`)
    - [x] ExtGState blend modes (`/BM`) (multiply/screen/overlay at minimum; parsing+propagation) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`, `src/pdf/domain/graphics-state/types.ts`)
    - [ ] ExtGState soft mask (`/SMask`) for vector/text content (alpha/luminosity masks)
      - [x] constant `/SMask` subset (Alpha/Luminosity): detect a Form group that fills its `/BBox` with uniform `/ca` (Alpha) or uniform `g` fill (Luminosity), propagate as `softMaskAlpha`, and multiply into fill/stroke alpha at conversion time (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`, `src/pdf/converter/color-converter.ts`, `src/pdf/converter/text-to-shapes.ts`)
      - [ ] non-constant `/SMask` (per-pixel) evaluation (requires rendering the mask group)
        - [x] limited per-pixel subset: image-only `/G` mask groups (Form XObject that draws one-or-more `Do` images) are evaluated (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] `/S /Luminosity`: luminosity from the mask image RGB (`convertToRgba`) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] `/S /Alpha`: uses the mask image’s own `/SMask` (alpha image) when present; otherwise falls back to a grayscale heuristic (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] `/S /Luminosity`: multiplies luminosity by the mask image alpha (`/SMask`) when present (mask group result alpha) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] honors mask Form `/Matrix` for mask-space → user-space mapping (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] accepts flipped mask images (negative scale) and normalizes alpha orientation (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] supports mask images that don’t fully cover the Form `/BBox` (resampling in mask space; outside → alpha 0) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
        - [x] supports non-axis-aligned image matrices (rotation/shear) by inverse-mapping sample points into image space (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
        - [x] preserve per-pixel masks by rasterizing masked filled paths into `PdfImage` (samples in mask space and maps via `graphicsState.ctm × softMask.matrix`) (`src/pdf/parser/soft-mask-raster.native.ts`, `src/pdf/parser/soft-mask-raster.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`)
        - [x] preserve `f` (nonzero) vs `f*` (evenodd) fill-rule differences when rasterizing soft-masked paths (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/parser/soft-mask-raster.native.ts`, `src/pdf/parser/soft-mask-raster.native.spec.ts`)
        - [x] apply per-pixel masks to extracted `PdfImage` elements by pre-compositing `graphicsState.softMask` into `image.alpha` (`src/pdf/parser/soft-mask-apply.native.ts`, `src/pdf/parser/pdf-parser.native.ts`)
        - [ ] general per-pixel mask evaluation for arbitrary vector/text content (requires vector/text rasterization or compositing)
          - [x] vector fills/strokes are preserved by rasterizing masked paths into `PdfImage` (`src/pdf/parser/soft-mask-raster.native.ts`, `src/pdf/parser/soft-mask-raster.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`)
          - [ ] text under per-pixel masks (requires text rasterization/outlines)
            - [x] bbox-based rasterization of masked text (deterministic, but over-paints glyph interiors) (`src/pdf/parser/soft-mask-text-raster.native.ts`, `src/pdf/parser/soft-mask-text-raster.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`)
      - [ ] broader `/S /Luminosity` support (non-constant)
        - [x] luminosity from mask images in `/DeviceRGB` (and other device spaces via RGBA conversion) for the limited per-pixel subset (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
        - [ ] complex luminosity groups (multi-element mask content, compositing/blend within the group, nontrivial transforms)
          - [x] multiple-image mask Forms: composite `Do` images in order using source-over, then compute `luminosity × groupAlpha` (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
    - [x] ExtGState line style overrides via `gs` (`/LW`, `/LC`, `/LJ`, `/ML`, `/D`) for PDFs that don’t use `w/J/j/M/d` directly (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`)
    - [ ] Transparency groups (`/Group`) with `Isolated`/`Knockout` behavior (often appears with soft masks)
  - [ ] complex transforms (shear/rotation matrix edge cases; currently warns/fallbacks) (`src/pdf/converter/transform-converter.ts`)
  - [ ] clipping paths (bbox-only is implemented; full path clipping is still missing)
    - [ ] apply `W`/`W*` clip paths to subsequent paths/text/images (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/converter/pdf-to-shapes.ts`)
      - [x] propagate rectangular `re W n` clips as `graphicsState.clipBBox` (bbox-only) and apply to images via `a:srcRect` cropping when image CTM has no rotation/shear (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/parser/clip-rect.native.spec.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
      - [x] propagate non-`re` clip paths as `graphicsState.clipBBox` using the clip path's bounding box (bbox-only) (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/parser/clip-rect.native.spec.ts`)
      - [x] drop paths/text completely outside rectangular `clipBBox` (bbox-only) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/clip-rect.native.spec.ts`)
      - [x] drop images completely outside rectangular `clipBBox` (bbox-only) (`src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
    - [x] text clip modes (`Tr=4..7`) (bbox-only)
      - [x] bbox-only: `Tr=4..7` intersects `graphicsState.clipBBox` with per-run text bbox; `Tr=3/7` suppresses visible text output (`src/pdf/parser/operator/text-handlers.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/clip-rect.native.spec.ts`)
- [ ] **Text model**
  - [ ] Type3 font handling (charprocs, widths, resources)
    - [x] Type3 `/Widths` scaled by `/FontMatrix` for correct text advance (`src/pdf/parser/font-decoder.native.ts`, `src/pdf/parser/font-decoder.native.spec.ts`)
    - [x] Type3 width fallback from `d0`/`d1` when `/Widths` is missing/incomplete (`src/pdf/parser/font-decoder.native.ts`, `src/pdf/parser/type3-d0-width.native.spec.ts`)
    - [x] Type3 glyph rendering: execute `/CharProcs` streams to paths (required for icon fonts) (`src/pdf/parser/type3-glyph.native.ts`, `src/pdf/parser/type3-glyph.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/font-decoder.native.ts`)
    - [x] Type3 `/Resources` dictionary support for glyph programs that reference `/XObject` and `/ExtGState` (`src/pdf/parser/type3-expand.native.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/type3-resources.native.spec.ts`)
    - [ ] Type3 resources beyond `/XObject`/`/ExtGState` (patterns/colorspaces/etc.)
      - [x] Type3 `/Resources /Font` support for glyph programs that emit nested text (`src/pdf/parser/type3-expand.native.ts`, `src/pdf/parser/type3-font-resources.native.spec.ts`)
  - [x] robust fallback when `ToUnicode` is missing/partial (beyond current CID fallback maps) (`src/pdf/domain/font/text-decoder.ts`, `src/pdf/domain/font/text-decoder.spec.ts`)
  - [ ] XObject recursion (forms)
    - [x] treat `/Subtype /Form` XObjects as nested content streams (not images) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/form-xobject.native.spec.ts`)
    - [ ] apply Form `/Matrix` and `/BBox` clipping rules
      - [x] apply Form `/Matrix` to CTM during parsing (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/form-xobject.native.spec.ts`)
      - [ ] apply `/BBox` clipping to subsequent operations (requires full clip support) (`src/pdf/converter/pdf-to-shapes.ts`)
        - [x] intersect Form `/BBox` into `graphicsState.clipBBox` for nested parsing (bbox-only) (`src/pdf/parser/pdf-parser.native.ts`)
    - [x] inherit/override resources from the Form stream dict (`src/pdf/parser/pdf-parser.native.ts`)
    - [x] extract images referenced by Form-local `/XObject` resources (scope-aware) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/form-xobject.native.spec.ts`, `src/pdf/parser/image-extractor.native.ts`)
  - [ ] Inline images (BI/ID/EI)
    - [x] tokenizer-equivalent preprocessing for inline image dictionaries + raw bytes terminator rules (`src/pdf/parser/inline-image.native.ts`, `src/pdf/parser/inline-image.native.spec.ts`)
    - [x] decode inline images via the same image extraction path (filters/color spaces/masks) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/inline-image.native.spec.ts`)

## 7) Image extraction coverage

Current behavior in `src/pdf/parser/image-extractor.native.ts`: supports common XObject images, Flate predictors, and CCITT (via `ccitt-fax-decode.ts`) with “fail closed” on unsupported DecodeParms.

- [ ] **Additional filters**
  - [x] `LZWDecode` images (generic filters are now present; ensure extraction path uses them as needed) (`src/pdf/parser/image-extractor.spec.ts`)
  - [x] `DCTDecode` → decode to pixel bytes when required by output format (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [ ] `JPXDecode` → decode to pixel bytes when required by output format
    - [ ] base image `/JPXDecode` (JPEG2000) decode
    - [ ] soft mask `/JPXDecode` decode (`src/pdf/parser/image-extractor.native.ts`)
- [ ] **Color spaces / masks**
  - [ ] ICCBased: parse ICC profiles (currently infers by component count; warns on unusual cases) (`src/pdf/converter/color-converter.ts`, `src/pdf/converter/pixel-converter.ts`)
  - [ ] Special color spaces for images
    - [x] `/Indexed` palette images (expand to DeviceRGB) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] `/Separation` and `/DeviceN` (spot colors; deterministic tint→grayscale RGB fallback) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [ ] `/Lab` and calibrated spaces (`/CalGray` `/CalRGB`) beyond the current “treat as Device*” mapping
      - [x] `/Lab` image conversion (Lab→sRGB, WhitePoint + Range honored; deterministic) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [ ] ICCBased profile parsing (beyond component-count inference)
      - [x] handle ICCBased with uncommon `N` deterministically (avg components → grayscale RGB) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `SMask` / soft-mask alpha handling (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
  - [ ] `SMask` edge cases
    - [x] `/Matte` handling (un-matte RGB before applying alpha to avoid halo/fringe) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
    - [x] soft mask with `BitsPerComponent != 8` (1/2/4/16 supported) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] soft mask with `/CCITTFaxDecode` (Group3/4) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [ ] soft mask filter chains beyond the current allow-list
  - [ ] Image masks
    - [x] `/ImageMask true` stencil images (1-bit) + `/Decode` inversion rules (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] `/Mask` key handling (color-key masks and explicit mask streams, including `/Indexed` color-key masks) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `/Decode` array handling for base images (component scaling/inversion) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/converter/pixel-converter.ts`, `src/pdf/parser/image-extractor.spec.ts`, `src/pdf/converter/image-to-shapes.ts`)
  - [x] DeviceCMYK end-to-end correctness validation (`src/pdf/parser/image-extractor.spec.ts`)
- [ ] **CCITT completeness** (`src/pdf/parser/ccitt-fax-decode.ts`)
  - [x] Group 3 mixed 1D/2D (K > 0) (`src/pdf/parser/ccitt-fax-decode.ts`, `src/pdf/parser/ccitt-fax-decode.spec.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `EndOfLine=true` and `DamagedRowsBeforeError` handling (accepted as no-ops for Group4 /K=-1) (`src/pdf/parser/ccitt-fax-decode.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `EndOfLine=true` support for Group3 (K >= 0) (`src/pdf/parser/ccitt-fax-decode.ts`, `src/pdf/parser/ccitt-fax-decode.spec.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `DamagedRowsBeforeError` resync support for Group3 (K >= 0) (`src/pdf/parser/ccitt-fax-decode.ts`, `src/pdf/parser/ccitt-fax-decode.spec.ts`)

## 8) Metadata extraction

Current behavior: `Info` uses `PdfString.text` which is BOM-aware, otherwise Latin-1 (`src/pdf/native/document.ts`, `src/pdf/native/encoding.ts`).

- [x] **Info string encoding**: PDFDocEncoding fallback for common metadata fields (Title/Author/Subject) (`src/pdf/native/encoding.ts`)
- [x] **XMP metadata**: parse `/Metadata` stream (XML) (`src/pdf/native/xmp.ts`, `src/pdf/native/xmp.spec.ts`)

## 9) Fixtures / sample PDFs (for building coverage)

- [x] **CLI-generated PDFs (famous library)**
  - [x] add a deterministic generator script (bun CLI) that produces a small set of PDFs for tests (text, images, multi-page, etc.) (`scripts/generate-pdfkit-fixtures.ts`)
  - [x] add an integration spec that asserts generator output matches checked-in fixtures byte-for-byte (`spec/integration/pdfkit-fixtures.spec.ts`)
- [ ] **Extend generator fixtures as gaps are implemented**
  - [ ] add a pdfkit fixture that exercises ExtGState alpha + blend mode (when `/BM` is supported)
  - [ ] add a pdfkit fixture that exercises clipping (when clip paths are supported)
  - [x] add a fixture/spec that exercises Type3 text (if pdfkit can emit Type3; otherwise, use a handcrafted PDF fixture) (`src/pdf/parser/type3-glyph.native.spec.ts`)
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
