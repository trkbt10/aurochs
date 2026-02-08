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
- [VS Code extension](https://marketplace.visualstudio.com/items?itemName=trkbt10.aurochs-office-viewer) — view PPTX/PPT, DOCX/DOC, XLSX/XLS directly in VS Code

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

## Claude Code Skill

A [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) that teaches Claude how to inspect, build, and verify Office documents via the `aurochs` CLI.

### Install

Add the marketplace and install the plugin in Claude Code:

```
/plugin marketplace add trkbt10/aurochs
/plugin install aurochs-office
```

### What the skill provides

Once installed, Claude Code can automatically inspect, build, and verify PPTX / DOCX / XLSX files:

| Format | Inspect | Extract | Preview | Build |
| ------ | ------- | ------- | ------- | ----- |
| PPTX | `aurochs pptx info/list/show` | `aurochs pptx extract` | `aurochs pptx preview` | `aurochs pptx build spec.json` |
| DOCX | `aurochs docx info/list/show` | `aurochs docx extract` | `aurochs docx preview` | Template copy only |
| XLSX | `aurochs xlsx info/list/show` | `aurochs xlsx extract` | `aurochs xlsx preview` | Template copy only |

Just ask Claude naturally — e.g. "Show me what's in presentation.pptx" or "Build a PPTX from this spec" — and it will pick the right commands.

See [`skills/aurochs-office/SKILL.md`](./skills/aurochs-office/SKILL.md) for full command reference.
