# aurochs

Parse, render, and edit Office documents (PPTX, DOCX, XLSX) in pure TypeScript. No native dependencies, no server required.

**[Demo](https://trkbt10.github.io/aurochs/)**

## Features

- Browser-based viewer & editor for PPTX / DOCX / XLSX
- Legacy format support (PPT, DOC, XLS) via built-in converters
- CLI for inspecting and previewing files (`aurochs pptx preview slides.pptx`)
- Figma `.fig` renderer (SVG / WebGL)
- PDF → PPTX converter
- Builder API for generating documents programmatically
- MCP server for AI assistant integration
- VS Code extension

## Setup

```bash
bun install
bun run dev:pages    # start demo app
```

```bash
bun run test         # run tests
bun run lint         # lint
bun run typecheck    # type check
bun run build:cli    # build CLI
```
