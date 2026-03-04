# aurochs Office Viewer

View Office documents directly in VS Code — no external applications, no cloud services, no native dependencies.

All parsing and rendering runs locally in pure TypeScript.

## Supported Formats

| Format | Extensions | Rendering |
|--------|-----------|-----------|
| PowerPoint | `.pptx`, `.ppt` | SVG slides with navigation |
| Word | `.docx`, `.doc` | HTML with paragraph/table styling |
| Excel | `.xlsx`, `.xls` | HTML tables with sheet tabs |
| PDF | `.pdf` | SVG pages with thumbnails and navigation |

Both modern (OOXML) and legacy (OLE2/CFB) formats are supported.

## Features

- **Just open a file** — the viewer activates automatically when you open a supported file
- **Zero dependencies** — all parsing and rendering is built-in; works offline, no external tools needed
- **Read-only viewer** — opens supported files as custom editor tabs
- **Slide navigation** — thumbnail sidebar with keyboard shortcuts (Arrow keys, Home/End) for presentations
- **Zoom control** — adjustable zoom slider for all document types
- **Sheet tabs** — switch between worksheets in spreadsheets
- **Theme-aware** — respects your VS Code color theme (light/dark)

## How It Works

### PowerPoint (.pptx / .ppt)

Slides are parsed and rendered to SVG. Navigate with the thumbnail sidebar or keyboard shortcuts.

### Word (.docx / .doc)

Documents are rendered to styled HTML with support for paragraphs, headings, tables, text formatting (bold, italic, underline, color, font), hyperlinks, and more.

### Excel (.xlsx / .xls)

Workbooks are rendered as HTML tables. Switch between sheets using the tab bar at the bottom. Merged cells, number formatting, and cell styling are preserved.

### PDF (.pdf)

PDF pages are rendered to SVG and displayed in a dedicated viewer with page thumbnails, keyboard navigation, and zoom controls.

## Tips

- To switch between this viewer and the built-in hex editor, right-click the file tab and choose **Reopen Editor With...**
- Multiple files can be opened side by side

## Links

- [GitHub](https://github.com/trkbt10/aurochs)
- [Issues](https://github.com/trkbt10/aurochs/issues)

## License

MIT
