# aurochs

Parse, render, and edit Office documents (PPTX, DOCX, XLSX) in pure TypeScript. No native dependencies, no server required.

**[Demo](https://trkbt10.github.io/aurochs/)**

## Features

- **Parsers** — PPTX, DOCX, XLSX (ECMA-376) and legacy PPT, DOC, XLS, plus Figma `.fig` and PDF
- **Renderers** — SVG, WebGL, React components, ASCII terminal preview
- **Builders** — programmatic document creation from JSON spec
- **Converters** — DOC→DOCX, PPT→PPTX, XLS→XLSX, PDF→PPTX
- **CLI** — 45 commands for inspecting, building, and comparing files
- **MCP Server** — 20 tools for AI-assisted presentation editing
- **VS Code Extension** — view PPTX/PPT, DOCX/DOC, XLSX/XLS directly in the editor
- **Browser demo** — viewer, editor, and slideshow, all client-side

## Setup

```bash
bun install
bun run dev:pages    # start demo app
```

```bash
bun run test         # run tests
bun run lint         # lint
bun run typecheck    # type check
```

## CLI

```bash
npx aurochs pptx <command> [options] <file>
npx aurochs docx <command> [options] <file>
npx aurochs xlsx <command> [options] <file>
```

### PPTX commands

| Category | Commands |
| -------- | -------- |
| Inspect | `info`, `list`, `show`, `theme`, `inventory` |
| Extract | `extract`, `tables`, `images` |
| Preview | `preview` |
| Build | `build`, `patch`, `verify` |
| Compare | `diff` |

### DOCX commands

| Category | Commands |
| -------- | -------- |
| Inspect | `info`, `list`, `show`, `styles`, `numbering`, `headers-footers`, `toc` |
| Extract | `extract`, `tables`, `images`, `comments` |
| Preview | `preview` |
| Build | `build`, `patch`, `verify` |

### XLSX commands

| Category | Commands |
| -------- | -------- |
| Inspect | `info`, `list`, `show`, `styles`, `names`, `tables` |
| Extract | `extract`, `formulas`, `strings`, `comments`, `hyperlinks` |
| Data | `autofilter`, `validation`, `conditional` |
| Preview | `preview` |
| Build | `build`, `verify` |

All commands support `-o json|pretty` output format (default: `pretty`).

## VS Code Extension

View Office documents directly in VS Code with zero configuration.

**Install from Marketplace:**
```
ext install trkbt10.aurochs-office-viewer
```

Supported formats: PPTX, PPT, DOCX, DOC, XLSX, XLS — files open automatically in the custom viewer.

[Marketplace page](https://marketplace.visualstudio.com/items?itemName=trkbt10.aurochs-office-viewer)

## MCP Server

Model Context Protocol server for AI-assisted presentation editing. Works with Claude Desktop, Cline, and other MCP clients.

```bash
# stdio transport (default)
bun packages/@aurochs-mcp/pptx-mcp/src/index.ts

# HTTP transport
bun packages/@aurochs-mcp/pptx-mcp/src/index.ts --transport http --port 3000
```

20 tools available:

| Category | Tools |
| -------- | ----- |
| Presentation | `pptx_create_presentation`, `pptx_get_info`, `pptx_build` |
| Slides | `pptx_add_slide`, `pptx_remove_slide`, `pptx_duplicate_slide`, `pptx_reorder_slide`, `pptx_modify_slide` |
| Shapes | `pptx_add_shape`, `pptx_add_text_box`, `pptx_add_image`, `pptx_add_connector`, `pptx_add_group` |
| Tables | `pptx_add_table`, `pptx_update_table` |
| Effects | `pptx_set_transition`, `pptx_add_animations` |
| Notes | `pptx_set_speaker_notes`, `pptx_add_comments` |
| Rendering | `pptx_render_slide` |

Each tool operates on an in-memory session and returns SVG previews after every operation.

## Converters

Convert legacy and cross-format documents. All converters run entirely in-memory.

| Converter | From | To |
| --------- | ---- | -- |
| `@aurochs-converters/doc-to-docx` | DOC (Word 97-2003) | DOCX |
| `@aurochs-converters/ppt-to-pptx` | PPT (PowerPoint 97-2003) | PPTX |
| `@aurochs-converters/xls-to-xlsx` | XLS (BIFF8) | XLSX |
| `@aurochs-converters/pdf-to-pptx` | PDF | PPTX |

## Builders

Create documents programmatically from JSON specifications.

| Package | Description |
| ------- | ----------- |
| `@aurochs-builder/pptx` | Slides, shapes, images, tables, connectors, groups |
| `@aurochs-builder/docx` | Paragraphs, tables, styles, numbering, headers/footers |
| `@aurochs-builder/xlsx` | Worksheets, cells, formulas, styles, shared strings |
| `@aurochs-builder/chart` | Bar, line, pie, scatter, area charts with embedded data |
| `@aurochs-builder/diagram` | SmartArt / diagram layouts |
| `@aurochs-builder/mermaid` | Office chart / diagram → Mermaid syntax serializer |

## Renderers

Multiple output targets for each format.

| Package | SVG | React | ASCII | Mermaid |
| ------- | --- | ----- | ----- | ------- |
| `@aurochs-renderer/pptx` | yes | yes | yes | — |
| `@aurochs-renderer/docx` | — | — | yes | — |
| `@aurochs-renderer/xlsx` | — | — | yes | — |
| `@aurochs-renderer/chart` | yes | — | yes | yes |
| `@aurochs-renderer/diagram` | — | yes | yes | yes |
| `@aurochs-renderer/figma` | yes | — | — | — |

### Figma `.fig` renderer

Parses Figma binary files and renders to SVG or WebGL.

- **SVG** — all node types, fills, effects, text, symbol/instance resolution
- **WebGL** — GPU-accelerated rendering with stencil-based path fill, Gaussian blur, inner/drop shadows

## Parsers

Low-level format parsers. Each returns a typed domain model.

| Package | Format |
| ------- | ------ |
| `@aurochs-office/pptx` | ECMA-376 PresentationML |
| `@aurochs-office/docx` | ECMA-376 WordprocessingML |
| `@aurochs-office/xlsx` | ECMA-376 SpreadsheetML |
| `@aurochs-office/ppt` | PowerPoint 97-2003 binary |
| `@aurochs-office/doc` | Word 97-2003 binary |
| `@aurochs-office/xls` | Excel BIFF8 binary |
| `@aurochs-office/chart` | Office chart XML |
| `@aurochs-office/diagram` | Office diagram / SmartArt XML |
| `@aurochs-office/drawing-ml` | DrawingML (shapes, effects, 3D) |
| `@aurochs-office/cfb` | Compound File Binary (OLE) |
| `@aurochs/fig` | Figma `.fig` (Kiwi binary) |
| `@aurochs/pdf` | PDF (structure, fonts, images, paths) |

## Claude Code Skill

A [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) that teaches Claude how to inspect, build, and verify Office documents via the `aurochs` CLI.

### Install

```
/plugin marketplace add trkbt10/aurochs
/plugin install aurochs-office
```

Once installed, ask Claude naturally — e.g. "Show me what's in presentation.pptx" or "Build a PPTX from this spec" — and it will pick the right commands.

See [`skills/aurochs-office/SKILL.md`](./skills/aurochs-office/SKILL.md) for full command reference.

## Package structure

```
packages/
  @aurochs/              # Core utilities (zip, xml, color, buffer, fig, pdf, ...)
  @aurochs-office/       # Format parsers (pptx, docx, xlsx, ppt, doc, xls, ...)
  @aurochs-builder/      # Document builders (pptx, docx, xlsx, chart, diagram, mermaid)
  @aurochs-renderer/     # Renderers (pptx, docx, xlsx, chart, diagram, figma)
  @aurochs-converters/   # Format converters (doc→docx, ppt→pptx, xls→xlsx, pdf→pptx)
  @aurochs-cli/          # CLI packages (cli, pptx-cli, docx-cli, xlsx-cli, cli-core)
  @aurochs-ui/           # React editor components (pptx, docx, xlsx, chart, diagram, ...)
  @aurochs-mcp/          # MCP server (pptx-mcp)
  @aurochs-build/        # Build tooling (vscode-office-viewer)
extensions/
  aurochs-office-viewer/ # VS Code extension
```