# DOCX Editor Feature Support

DOCX エディターの機能対応状況チェックリスト。

## Legend

- [x] = Supported
- [ ] = Not supported
- [~] = Partial support

---

## Run Properties (文字書式)

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Bold | [x] | [x] | [x] | `DocxRunProperties.bold` |
| Italic | [x] | [x] | [x] | `DocxRunProperties.italic` |
| Underline | [x] | [x] | [x] | Multiple styles supported |
| Strike | [x] | [x] | [x] | `DocxRunProperties.strike` |
| Double Strike | [x] | [x] | [x] | `DocxRunProperties.dstrike` |
| Font Size | [x] | [x] | [x] | HalfPoints unit |
| Font Family | [x] | [x] | [x] | `DocxRunFonts` (ascii, eastAsia, hAnsi, cs) |
| Font Color | [x] | [x] | [x] | RGB and theme colors |
| Highlight | [x] | [x] | [x] | `DocxHighlightColor` |
| Shading | [x] | [x] | [x] | Run-level background |
| Vertical Align | [x] | [x] | [x] | superscript, subscript, baseline |
| Caps | [x] | [x] | [x] | All caps, small caps |
| Letter Spacing | [x] | [x] | [x] | `DocxRunProperties.spacing` |
| Kerning | [x] | [~] | [x] | Parse/render supported |
| Position | [x] | [~] | [x] | Vertical position offset |
| Text Effects | [x] | [ ] | [~] | shadow, emboss, engrave, outline |
| Theme Fonts | [x] | [~] | [x] | majorHAnsi, minorHAnsi, etc. |
| RTL | [x] | [~] | [x] | Right-to-left text direction |
| East Asian Layout | [x] | [ ] | [~] | combine, emphasis, etc. |

---

## Paragraph Properties (段落書式)

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Alignment | [x] | [x] | [x] | left, center, right, justify, distribute |
| Spacing Before/After | [x] | [x] | [x] | `DocxParagraphSpacing` |
| Line Spacing | [x] | [x] | [x] | auto, exact, atLeast |
| Indent | [x] | [x] | [x] | left, right, hanging, firstLine |
| Tab Stops | [x] | [~] | [x] | Custom tab positions |
| Borders | [x] | [~] | [x] | top, bottom, left, right, between |
| Shading | [x] | [x] | [x] | Paragraph background |
| Keep Lines | [x] | [ ] | [~] | Prevent line breaks within paragraph |
| Keep With Next | [x] | [ ] | [~] | Keep with following paragraph |
| Widow/Orphan Control | [x] | [ ] | [~] | Prevent single lines on page break |
| Page Break Before | [x] | [ ] | [~] | Start paragraph on new page |
| Outline Level | [x] | [~] | [x] | Heading levels (0-9) |
| Text Direction | [x] | [~] | [x] | lrTb, tbRl, btLr, etc. |
| BiDi | [x] | [~] | [x] | Bidirectional paragraph |

---

## Numbering (箇条書き・番号)

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Bullet Lists | [x] | [x] | [x] | Symbol bullets |
| Numbered Lists | [x] | [x] | [x] | decimal, lowerLetter, upperLetter |
| Roman Numerals | [x] | [x] | [x] | lowerRoman, upperRoman |
| Multi-level Lists | [x] | [~] | [x] | Up to 9 levels |
| List Styles | [x] | [~] | [x] | `DocxAbstractNum` |
| Level Override | [x] | [ ] | [x] | `DocxLevelOverride` |
| Arabic Numbering | [x] | [ ] | [x] | Arabic numeral formats |
| Hebrew Numbering | [x] | [ ] | [x] | Hebrew letter formats |
| Picture Bullets | [x] | [ ] | [ ] | `DocxNumPicBullet` |

---

## Tables

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Basic Tables | [x] | [x] | [x] | Rows, cells, content |
| Table Width | [x] | [x] | [x] | auto, dxa, pct |
| Table Alignment | [x] | [x] | [x] | left, center, right |
| Column Widths | [x] | [x] | [x] | `DocxTableGrid` |
| Row Height | [x] | [x] | [x] | auto, exact, atLeast |
| Cell Merge (Horizontal) | [x] | [x] | [x] | `gridSpan` |
| Cell Merge (Vertical) | [x] | [x] | [x] | `vMerge` |
| Cell Borders | [x] | [x] | [x] | Individual edge styles |
| Table Borders | [x] | [x] | [x] | Table-level borders |
| Cell Shading | [x] | [x] | [x] | Cell background colors |
| Cell Vertical Align | [x] | [x] | [x] | top, center, bottom |
| Cell Margins | [x] | [x] | [x] | `DocxTableCellProperties.margin` |
| Table Indent | [x] | [~] | [x] | Table left margin |
| Table Layout | [x] | [~] | [x] | fixed, autofit |
| Header Row | [x] | [~] | [x] | Repeat header on page break |
| Cell Text Direction | [x] | [~] | [x] | tbRl, btLr, etc. |
| Cell No Wrap | [x] | [ ] | [x] | Prevent text wrapping |
| Row Can't Split | [x] | [ ] | [~] | Keep row on single page |
| Table BiDi | [x] | [ ] | [x] | Right-to-left table layout |

---

## Section Properties (セクション)

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Page Size | [x] | [x] | [x] | width, height, orientation |
| Page Margins | [x] | [x] | [x] | top, bottom, left, right |
| Header Margin | [x] | [x] | [x] | Distance from edge |
| Footer Margin | [x] | [x] | [x] | Distance from edge |
| Gutter Margin | [x] | [~] | [x] | Binding margin |
| Columns | [x] | [~] | [x] | Multi-column layout |
| Section Break | [x] | [~] | [x] | continuous, nextPage, evenPage, oddPage |
| Page Numbering | [x] | [~] | [x] | Start, format, chapStyle |
| Title Page | [x] | [ ] | [~] | Different first page header/footer |
| Line Numbering | [x] | [ ] | [ ] | `DocxLineNumbering` |
| Document Grid | [x] | [ ] | [ ] | `DocxDocGrid` |

---

## Headers/Footers

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Default Header | [x] | [~] | [~] | `DocxHeader` |
| Default Footer | [x] | [~] | [~] | `DocxFooter` |
| First Page Header | [x] | [ ] | [ ] | `HeaderFooterType.first` |
| Even Page Header | [x] | [ ] | [ ] | `HeaderFooterType.even` |
| Page Numbers | [x] | [ ] | [~] | `DocxPageNumberType` |

---

## Styles

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Paragraph Styles | [x] | [x] | [x] | `DocxStyle.type = "paragraph"` |
| Character Styles | [x] | [x] | [x] | `DocxStyle.type = "character"` |
| Table Styles | [x] | [~] | [~] | `DocxStyle.type = "table"` |
| Numbering Styles | [x] | [~] | [x] | `DocxStyle.type = "numbering"` |
| Style Inheritance | [x] | [x] | [x] | `DocxStyle.basedOn` |
| Default Styles | [x] | [x] | [x] | `DocxDocDefaults` |
| Latent Styles | [x] | [ ] | N/A | `DocxLatentStyles` |
| Style Link | [x] | [ ] | [x] | Character/paragraph link |

---

## Drawing / Images

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Inline Images | [x] | [ ] | [~] | `DocxDrawing` inline mode |
| Anchored Images | [x] | [ ] | [ ] | `DocxDrawing` anchor mode |
| Image Sizing | [x] | [ ] | [~] | EMU units |
| Image Cropping | [x] | [ ] | [ ] | `srcRect` |
| Text Wrap | [x] | [ ] | [ ] | square, tight, through, etc. |
| Image Position | [x] | [ ] | [ ] | Relative/absolute positioning |

---

## Advanced Features

| Feature | Parse | Edit | Render | Notes |
|---------|:-----:|:----:|:------:|-------|
| Bookmarks | [x] | [ ] | [ ] | `DocxBookmarkStart`/`End` |
| Hyperlinks | [x] | [~] | [x] | `DocxHyperlink` |
| Comments | [x] | [ ] | [ ] | `DocxComment` |
| Footnotes | [x] | [ ] | [ ] | `DocxFootnote` |
| Endnotes | [x] | [ ] | [ ] | `DocxEndnote` |
| Revisions | [x] | [ ] | [~] | Track changes |
| Math (OMML) | [x] | [ ] | [ ] | Office Math Markup |
| SDT (Content Controls) | [x] | [ ] | [ ] | Structured Document Tags |
| Document Protection | [x] | [ ] | N/A | `DocxDocumentProtection` |
| Compatibility Settings | [x] | [ ] | N/A | `DocxCompatSettings` |
| Theme | [x] | [~] | [x] | Color/font themes |
| Relationships | [x] | [~] | [x] | `DocxRelationships` |

---

## Implementation Priority (依存の末端から)

依存関係分析に基づく実装順序：

### Priority 1: 末端（他から依存されない）
- [x] Comments
- [x] Bookmarks
- [x] Footnotes/Endnotes
- [ ] Document Protection

### Priority 2: 低依存
- [x] Hyperlinks
- [ ] Headers/Footers full editing
- [ ] Drawing/Images editing

### Priority 3: 中依存
- [x] Table editing (advanced features)
- [x] Numbering editing (multi-level)
- [~] Section breaks

### Priority 4: 高依存（他機能のベース）
- [x] Run properties (basic formatting)
- [x] Paragraph properties (basic formatting)
- [x] Styles

---

## Visual Regression Test Coverage

### Renderer Specs (@aurochs-renderer/docx/spec/)

| Category | Test Files | Status |
|----------|------------|--------|
| Run Properties | 21 spec files | Tested (spec/run/) |
| Paragraph Properties | 25 spec files | Tested (spec/paragraph/) |
| Tables | 15 spec files | Tested (spec/table/) |
| Sections | 8 spec files | Tested (spec/section/) |
| Numbering | 7 spec files | Tested (spec/numbering/) |
| Drawing | 2 spec files | Tested (spec/drawing/) |

### Editor Visual Regression (@aurochs-ui/docx-editor/spec/)

| Test Case | Feature | Diff | Status |
|-----------|---------|------|--------|
| bold-italic | Bold, italic text | 0.0% | PASS |
| font-sizes | Various font sizes | 0.0% | PASS |
| font-colors | Text colors (RGB) | 0.0% | PASS |
| underline-styles | Underline variations | 0.0% | PASS |
| strikethrough | Strike, double strike | 0.0% | PASS |
| superscript-subscript | Vertical alignment | 0.0% | PASS |
| highlighting | Highlight colors | 0.0% | PASS |
| alignment | left, center, right, justify | 0.0% | PASS |
| spacing | Before, after, line spacing | 0.0% | PASS |
| indentation | Left, right, firstLine, hanging | 0.0% | PASS |
| bullet-list | Basic bullet list | 0.0% | PASS |
| numbered-list | Decimal numbering | 0.0% | PASS |
| multi-level-list | Nested list levels | 0.0% | PASS |
| paragraph-borders | Paragraph borders | 0.0% | PASS |
| paragraph-shading | Background colors | 0.0% | PASS |
| font-families | Font family variations | 0.0% | PASS |
| caps | All caps, small caps | 0.0% | PASS |
| letter-spacing | Character spacing | 0.0% | PASS |
| mixed-formatting | Combined styles | 0.0% | PASS |
| run-shading | Run-level background | 0.0% | PASS |
| roman-numerals | Upper/lower Roman | 0.0% | PASS |
| letter-lists | Upper/lower letter | 0.0% | PASS |
| custom-bullets | Custom bullet chars | 0.0% | PASS |
| page-size | US Letter size | 0.0% | PASS |
| page-margins | Wide margins | 0.0% | PASS |
| tab-stops | Custom tab positions | 0.0% | PASS |

See: `packages/@aurochs-ui/docx-editor/docs/visual-regression-issues.md`

---

## References

- Domain types: `packages/@aurochs-office/docx/src/domain/`
- Renderer specs: `packages/@aurochs-renderer/docx/spec/`
- Editor UI: `packages/@aurochs-ui/docx-editor/src/`
- Builder: `packages/@aurochs-builder/docx/src/`
