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

- [x] **Explicit encryption model**
  - [x] Standard Security Handler (RC4 40-bit; `V=1`, `R=2`) with explicit password injection (`src/pdf/native/encryption/standard.ts`, `src/pdf/parser/native-load.spec.ts`)
  - [x] keep `password` mode behavior explicit (requires `encryption: { mode: "password", password }`) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/native-load.ts`)
  - [x] Standard Security Handler RC4 128-bit (`V=2`, `R=3`) (`src/pdf/native/encryption/standard.ts`, `src/pdf/native/encryption/standard.spec.ts`)
  - [x] Standard Security Handler AES (`V=4/5`) / Crypt filters
    - [x] `V=4` / `R=4` (AESV2) string/stream AES-CBC + per-object key derivation (`src/pdf/native/encryption/standard.ts`, `src/pdf/native/encryption/aes.ts`, `src/pdf/native/encryption/standard.spec.ts`, `src/pdf/native/encryption/aes.spec.ts`)
    - [x] `V=5` / `R=5` (AESV3) string/stream AES-256-CBC + UTF-8 password bytes (`src/pdf/native/encryption/standard.ts`, `src/pdf/native/encryption/aes.ts`, `src/pdf/native/encryption/sha256.ts`, `src/pdf/native/encryption/standard.spec.ts`)
    - [x] `V=5` / `R=6` (AESV3) string/stream AES-256-CBC + hardened hash (Algorithm 2.B) (`src/pdf/native/encryption/standard.ts`, `src/pdf/native/encryption/r6-hash.ts`, `src/pdf/native/encryption/sha512.ts`, `src/pdf/native/encryption/standard.spec.ts`)
      - [x] SASLprep password normalization (strict) (`src/pdf/native/encryption/saslprep.ts`, `src/pdf/native/encryption/saslprep.tables.ts`, `src/pdf/native/encryption/saslprep.spec.ts`)
    - [x] `/CF` crypt filter dictionaries (`/StmF`, `/StrF`) (needed for AES and some RC4 PDFs) (`src/pdf/native/encryption/standard.ts`)
      - [x] `/EFF` handling (embedded file streams) (`src/pdf/native/encryption/standard.ts`, `src/pdf/native/encryption/decrypt-object.ts`, `src/pdf/native/encryption/decrypt-object.spec.ts`)
    - [x] `/EncryptMetadata` handling (metadata stream encryption on/off) (`src/pdf/native/encryption/standard.ts`)
- [x] **Crypt filter integration** (depends on decryption support)
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

- [x] **Graphics model**
  - [x] Patterns/Shadings (currently `Pattern` falls back to black in conversion) (`src/pdf/converter/color-converter.ts`)
    - [x] `/Pattern` resources: tiling patterns and shading patterns (parse + evaluate)
      - [x] PatternType 2 (shading patterns) for fills: `/Pattern cs` + `scn` + `f/B` rasterized to `PdfImage` (axial/radial supported via `shading-raster`) (`src/pdf/parser/pattern.native.ts`, `src/pdf/parser/pattern-fill-raster.ts`, `src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/operator/path-handlers.ts`, `src/pdf/parser/pattern-shading-fill.native.spec.ts`)
      - [x] PatternType 1 (tiling patterns) for fills: PaintType 1 + paths-only cells sampled per-pixel into `PdfImage` (`src/pdf/parser/pattern.native.ts`, `src/pdf/parser/pattern-tiling-raster.ts`, `src/pdf/parser/operator/path-handlers.ts`, `src/pdf/parser/pattern-tiling-fill.native.spec.ts`)
        - [x] PaintType 2 (uncolored patterns; base color operands via `scn` and underlying color space via `cs`) (`src/pdf/domain/graphics-state/types.ts`, `src/pdf/domain/graphics-state/stack.ts`, `src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/pattern-tiling-raster.ts`, `src/pdf/parser/pattern-tiling-uncolored-fill.native.spec.ts`)
    - [x] `sh` operator (shading fill) coverage (axial/radial at minimum)
      - [x] ShadingType 2 axial (FunctionType 2; DeviceRGB/Gray) rasterized to `PdfImage` behind `shadingMaxSize>0` (`src/pdf/parser/shading.native.ts`, `src/pdf/parser/shading-raster.ts`, `src/pdf/parser/operator/shading-handlers.ts`, `src/pdf/parser/shading-fill.native.spec.ts`)
      - [x] ShadingType 3 radial (FunctionType 2; DeviceRGB/Gray; quadratic solve) rasterized to `PdfImage` behind `shadingMaxSize>0` (`src/pdf/parser/shading.native.ts`, `src/pdf/parser/shading-raster.ts`, `src/pdf/parser/shading-radial-fill.native.spec.ts`)
    - [x] `scn/SCN` with pattern name operand
      - [x] consume trailing pattern/separation name operand to avoid operand-stack leakage (pattern rendering still missing) (`src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/operator/color-handlers.spec.ts`)
      - [x] when only a pattern name is provided (no numeric components), set a deterministic fallback color (black) to avoid leaking a previous fill/stroke (`src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/operator/color-handlers.spec.ts`)
      - [x] when a pattern name is provided for PaintType 2 tiling patterns, capture numeric components as the base color (`fillPatternColor`/`strokePatternColor`) (`src/pdf/parser/operator/color-handlers.ts`, `src/pdf/domain/graphics-state/stack.ts`, `src/pdf/parser/operator/color-handlers.spec.ts`)
  - [x] transparency groups / soft masks (impacts image/text appearance)
    - [x] ExtGState alpha (`gs` + `/ca` `/CA`) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`)
    - [x] ExtGState blend modes (`/BM`) (multiply/screen/overlay at minimum; parsing+propagation) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`, `src/pdf/domain/graphics-state/types.ts`)
    - [x] ExtGState soft mask (`/SMask`) for vector/text content (alpha/luminosity masks)
      - [x] constant `/SMask` subset (Alpha/Luminosity): detect a Form group that fills its `/BBox` with uniform `/ca` (Alpha) or uniform `g` fill (Luminosity), propagate as `softMaskAlpha`, and multiply into fill/stroke alpha at conversion time (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`, `src/pdf/converter/color-converter.ts`, `src/pdf/converter/text-to-shapes.ts`)
      - [x] non-constant `/SMask` (per-pixel) evaluation (requires rendering the mask group)
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
        - [x] general per-pixel mask evaluation for arbitrary vector/text content (requires vector/text rasterization or compositing)
          - [x] vector fills/strokes are preserved by rasterizing masked paths into `PdfImage` (`src/pdf/parser/soft-mask-raster.native.ts`, `src/pdf/parser/soft-mask-raster.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`)
          - [x] text under per-pixel masks (requires text rasterization/outlines)
            - [x] bbox-based rasterization of masked text (deterministic, but over-paints glyph interiors) (`src/pdf/parser/soft-mask-text-raster.native.ts`, `src/pdf/parser/soft-mask-text-raster.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`)
              - [x] oriented run boxes (uses textMatrix translation + CTM; improves rotation via CTM) (`src/pdf/parser/soft-mask-text-raster.native.ts`)
      - [x] broader `/S /Luminosity` support (non-constant)
        - [x] luminosity from mask images in `/DeviceRGB` (and other device spaces via RGBA conversion) for the limited per-pixel subset (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
        - [x] accept `/ICCBased` mask images by inferring `/N` → Device* (N=1/3/4) for RGBA conversion (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
        - [x] complex luminosity groups (multi-element mask content, compositing/blend within the group, nontrivial transforms)
          - [x] multiple-image mask Forms: composite `Do` images in order using source-over, then compute `luminosity × groupAlpha` (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] mixed image+path mask Forms: rasterize mask paths onto the image-resolution grid then composite (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/soft-mask-raster.native.ts`)
          - [x] shading/pattern mask Forms: include rasterized `sh`/pattern output (`rasterImage`) in per-pixel mask evaluation (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] paths-only mask Forms: rasterize into a caller-provided grid size (`softMaskVectorMaxSize`) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`)
          - [x] text-only mask Forms: bbox-based rasterization into a caller-provided grid size (`softMaskVectorMaxSize`) (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
          - [x] mask group `/Group << /K true >>` (knockout) affects group compositing order (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
    - [x] ExtGState line style overrides via `gs` (`/LW`, `/LC`, `/LJ`, `/ML`, `/D`) for PDFs that don’t use `w/J/j/M/d` directly (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`, `src/pdf/parser/operator/graphics-state-handlers.ts`, `src/pdf/parser/operator/graphics-state-handlers.spec.ts`)
    - [x] Transparency groups (`/Group`) with `Isolated`/`Knockout` behavior (soft masks subset)
      - [x] honor group `/K` (Knockout) when compositing per-pixel soft masks (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
      - [x] honor group `/I` (Isolated) + soft mask `/BC` when evaluating per-pixel `/S /Luminosity` masks (`src/pdf/parser/ext-gstate.native.ts`, `src/pdf/parser/ext-gstate.native.spec.ts`)
  - [x] complex transforms (shear/rotation matrix edge cases; currently warns/fallbacks)
    - [x] warp sheared images to axis-aligned PNG at conversion time (preserves appearance without PPTX shear support) (`src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
  - [x] clipping paths (bbox-only by default; full clipping via rasterization when `clipPathMaxSize>0`)
    - [x] apply `W`/`W*` clip paths to subsequent paths/text/images (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/converter/pdf-to-shapes.ts`)
      - [x] propagate rectangular `re W n` clips as `graphicsState.clipBBox` (bbox-only) and apply to images via `a:srcRect` cropping when image CTM has no rotation/shear (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/parser/clip-rect.native.spec.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
      - [x] apply rectangular `graphicsState.clipBBox` to rotated/sheared images by baking the transform into a clipped PNG (bbox-only) (`src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
      - [x] propagate non-`re` clip paths as `graphicsState.clipBBox` using the clip path's bounding box (bbox-only) (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/parser/clip-rect.native.spec.ts`)
      - [x] per-pixel clip mask (`clipMask`) generation for `W`/`W*` when `clipPathMaxSize>0`, applied to images by baking into a PNG (supports rotated/non-rect clips) (`src/pdf/parser/operator/path-handlers.ts`, `src/pdf/domain/graphics-state/types.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/parser/clip-path-mask.native.spec.ts`)
      - [x] apply `clipMask` to paths/text by rasterizing into `PdfImage` when `clipPathMaxSize>0` (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/clip-mask-apply.native.ts`, `src/pdf/parser/clip-path-mask-apply.native.spec.ts`)
      - [x] drop paths/text completely outside rectangular `clipBBox` (bbox-only) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/clip-rect.native.spec.ts`)
      - [x] drop images completely outside rectangular `clipBBox` (bbox-only) (`src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
    - [x] text clip modes (`Tr=4..7`) (bbox-only)
      - [x] bbox-only: `Tr=4..7` intersects `graphicsState.clipBBox` with per-run text bbox; `Tr=3/7` suppresses visible text output (`src/pdf/parser/operator/text-handlers.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/clip-rect.native.spec.ts`)
- [x] **Text model**
  - [x] Type3 font handling (charprocs, widths, resources)
    - [x] Type3 `/Widths` scaled by `/FontMatrix` for correct text advance (`src/pdf/parser/font-decoder.native.ts`, `src/pdf/parser/font-decoder.native.spec.ts`)
    - [x] Type3 width fallback from `d0`/`d1` when `/Widths` is missing/incomplete (`src/pdf/parser/font-decoder.native.ts`, `src/pdf/parser/type3-d0-width.native.spec.ts`)
    - [x] Type3 glyph rendering: execute `/CharProcs` streams to paths (required for icon fonts) (`src/pdf/parser/type3-glyph.native.ts`, `src/pdf/parser/type3-glyph.native.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/font-decoder.native.ts`)
    - [x] Type3 `/Resources` dictionary support for glyph programs that reference `/XObject` and `/ExtGState` (`src/pdf/parser/type3-expand.native.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/type3-resources.native.spec.ts`)
    - [x] Type3 resources beyond `/XObject`/`/ExtGState` (patterns/colorspaces/etc.)
      - [x] Type3 `/Resources /Font` support for glyph programs that emit nested text (`src/pdf/parser/type3-expand.native.ts`, `src/pdf/parser/type3-font-resources.native.spec.ts`)
      - [x] Type3 `/Resources /Pattern` support for glyph programs that fill with tiling/shading patterns (`src/pdf/parser/type3-expand.native.ts`, `src/pdf/parser/type3-glyph.native.ts`, `src/pdf/parser/type3-pattern-resources.native.spec.ts`)
      - [x] Type3 `/Resources /Shading` support for glyph programs that use `sh` (`src/pdf/parser/type3-expand.native.ts`, `src/pdf/parser/type3-glyph.native.ts`, `src/pdf/parser/type3-shading-resources.native.spec.ts`)
  - [x] robust fallback when `ToUnicode` is missing/partial (beyond current CID fallback maps) (`src/pdf/domain/font/text-decoder.ts`, `src/pdf/domain/font/text-decoder.spec.ts`)
  - [x] XObject recursion (forms)
    - [x] treat `/Subtype /Form` XObjects as nested content streams (not images) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/form-xobject.native.spec.ts`)
    - [x] apply Form `/Matrix` and `/BBox` clipping rules (full clipping behind `clipPathMaxSize>0`; bbox-only by default)
      - [x] apply Form `/Matrix` to CTM during parsing (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/form-xobject.native.spec.ts`)
      - [x] apply `/BBox` clipping to subsequent operations via per-pixel `clipMask` generation when `clipPathMaxSize>0` (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/form-bbox-clip-mask.native.ts`, `src/pdf/parser/form-bbox-clip-mask.native.spec.ts`)
        - [x] intersect Form `/BBox` into `graphicsState.clipBBox` for nested parsing (bbox-only) (`src/pdf/parser/pdf-parser.native.ts`)
    - [x] inherit/override resources from the Form stream dict (`src/pdf/parser/pdf-parser.native.ts`)
    - [x] extract images referenced by Form-local `/XObject` resources (scope-aware) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/form-xobject.native.spec.ts`, `src/pdf/parser/image-extractor.native.ts`)
  - [x] Inline images (BI/ID/EI)
    - [x] tokenizer-equivalent preprocessing for inline image dictionaries + raw bytes terminator rules (`src/pdf/parser/inline-image.native.ts`, `src/pdf/parser/inline-image.native.spec.ts`)
    - [x] decode inline images via the same image extraction path (filters/color spaces/masks) (`src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/inline-image.native.spec.ts`)

## 7) Image extraction coverage

Current behavior in `src/pdf/parser/image-extractor.native.ts`: supports common XObject images, Flate predictors, and CCITT (via `ccitt-fax-decode.ts`) with “fail closed” on unsupported DecodeParms.

- [ ] **Additional filters**
  - [x] `LZWDecode` images (generic filters are now present; ensure extraction path uses them as needed) (`src/pdf/parser/image-extractor.spec.ts`)
  - [x] `DCTDecode` → decode to pixel bytes when required by output format (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [ ] `JPXDecode` → decode to pixel bytes when required by output format
    - [x] base image `/JPXDecode` decode via injected `jpxDecode` hook (`src/pdf/parser/jpx-decoder.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] soft mask `/JPXDecode` decode via injected `jpxDecode` hook (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [ ] bundled JPEG2000 decoder implementation (no external deps)
- [ ] **Color spaces / masks**
  - [ ] ICCBased: parse ICC profiles (currently infers by component count; warns on unusual cases)
    - [x] image ICCBased RGB/Gray (matrix + TRC) → DeviceRGB (`src/pdf/parser/icc-profile.native.ts`, `src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] fill/stroke ICCBased colors (parse `/Resources /ColorSpace` ICC streams and convert `sc/SC` → DeviceRGB deterministically) (`src/pdf/parser/color-space.native.ts`, `src/pdf/parser/operator/color-handlers.ts`, `src/pdf/parser/operator/color-handlers.spec.ts`, `src/pdf/parser/pdf-parser.native.ts`, `src/pdf/domain/graphics-state/stack.ts`)
    - [ ] LUT-based/CMYK ICC transforms (not supported yet)
  - [ ] Special color spaces for images
    - [x] `/Indexed` palette images (expand to DeviceRGB) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] `/Separation` and `/DeviceN` (spot colors; deterministic tint→grayscale RGB fallback) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] `/Lab` and calibrated spaces (`/CalGray` `/CalRGB`) beyond the current “treat as Device*” mapping
      - [x] `/Lab` image conversion (Lab→sRGB, WhitePoint + Range honored; deterministic) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
      - [x] `/CalGray` image conversion (Gamma + WhitePoint → XYZ → sRGB; deterministic) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
      - [x] `/CalRGB` image conversion (Gamma + Matrix → XYZ → sRGB; deterministic) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [ ] ICCBased profile parsing (beyond component-count inference)
      - [x] parse ICCBased RGB/Gray profiles (matrix + TRC; deterministic) (`src/pdf/parser/icc-profile.native.ts`, `src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
      - [x] handle ICCBased with uncommon `N` deterministically (avg components → grayscale RGB) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `SMask` / soft-mask alpha handling (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
  - [ ] `SMask` edge cases
    - [x] `/Matte` handling (un-matte RGB before applying alpha to avoid halo/fringe) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`, `src/pdf/converter/image-to-shapes.ts`, `src/pdf/converter/image-to-shapes.spec.ts`)
    - [x] soft mask with `BitsPerComponent != 8` (1/2/4/16 supported) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] soft mask with `/CCITTFaxDecode` (Group3/4) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] soft mask filter chains beyond the current allow-list (LZW + Predictor support) (`src/pdf/native/filters/index.ts`, `src/pdf/native/filters/predictor.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] Image masks
    - [x] `/ImageMask true` stencil images (1-bit) + `/Decode` inversion rules (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
    - [x] `/Mask` key handling (color-key masks and explicit mask streams, including `/Indexed` color-key masks) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/parser/image-extractor.spec.ts`)
  - [x] `/Decode` array handling for base images (component scaling/inversion) (`src/pdf/parser/image-extractor.native.ts`, `src/pdf/converter/pixel-converter.ts`, `src/pdf/parser/image-extractor.spec.ts`, `src/pdf/converter/image-to-shapes.ts`)
  - [x] DeviceCMYK end-to-end correctness validation (`src/pdf/parser/image-extractor.spec.ts`)
- [x] **CCITT completeness** (`src/pdf/parser/ccitt-fax-decode.ts`)
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
  - [x] add a pdfkit fixture that exercises ExtGState alpha + blend mode (when `/BM` is supported) (`scripts/generate-pdfkit-fixtures.ts`, `spec/integration/pdfkit-fixtures.spec.ts`, `spec/fixtures/pdfkit/pdfkit-alpha-blend.pdf`)
  - [x] add a pdfkit fixture that exercises clipping (when clip paths are supported) (`scripts/generate-pdfkit-fixtures.ts`, `spec/integration/pdfkit-fixtures.spec.ts`, `spec/fixtures/pdfkit/pdfkit-clipping.pdf`)
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
