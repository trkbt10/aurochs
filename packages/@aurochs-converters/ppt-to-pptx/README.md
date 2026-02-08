# web-pptx fixtures (PPT ⇄ PPTX)

This package is a **handy fixture corpus** for testing PPT⇄PPTX conversion logic in `web-pptx`.

## Directory structure

- `cases/<caseId>/author.pptx`
  - Source deck authored programmatically (python-pptx). This is *not* the golden output.
- `cases/<caseId>/ref.ppt`
  - PPT exported by LibreOffice from `author.pptx`.
- `cases/<caseId>/ref.pptx`
  - PPTX exported by LibreOffice from `ref.ppt` (i.e., `PPTX -> PPT -> PPTX` round-trip).
  - Use this as the **expected** result of `PPT -> PPTX` conversion.
- `cases/<caseId>/render/{ppt,pptx}/slide-###.png`
  - Golden screenshots rendered via `LibreOffice -> PDF -> pdftoppm(PNG)`.
  - Resolution is 960x540 (16:9 at 72dpi), so it's lightweight and deterministic.

## How to use (recommended)

### PPT -> PPTX
Input: `cases/<id>/ref.ppt`  
Expected: `cases/<id>/ref.pptx`

Compare:
- (A) OOXML structure after normalization (recommended once you have an IR), and/or
- (B) image regression via your own renderer.

### PPTX -> PPT (and round-trip)
Input: `cases/<id>/ref.pptx`  
Expected: `cases/<id>/ref.ppt`

Round-trip strategy:
1) `ref.pptx` -> ppt -> pptx
2) compare the final pptx to `ref.pptx` (structure and/or image)

## Regenerating fixtures

Dependencies:
- LibreOffice (`soffice`) on PATH
- Poppler (`pdftoppm`) on PATH
- Python 3.11 + python-pptx + pillow

Run:
```bash
python scripts/generate_fixtures.py
```

Notes:
- The generator isolates LibreOffice profile by using `-env:UserInstallation=...` to avoid first-run dialogs.
- LibreOffice versions can change output subtly. Pin the LO version in CI if you use byte-level diffs.

## Case levels

- `core`: start here; shapes/text/images/multi-slide
- `extended`: bullets, alignment, crop/rotate, hyperlinks, notes
- `hard`: tables(merge), charts

See `cases/<id>/meta.json` for tags & notes.

## License

CC0-1.0 (see LICENSE). This includes generated binaries and images.
