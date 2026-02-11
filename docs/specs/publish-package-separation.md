# Publish Package Separation Design

## Background & Requirements

In the current monorepo structure, the root `package.json` (name="aurochs") is published as a CLI package. This will be changed as follows.

## Changes

### 1. Convert monorepo root to a pure workspace

- Change the root `package.json` name (e.g., `aurochs-workspace`)
- Exclude from publish targets

### 2. Create publish package internally

- Same pattern as `extensions/aurochs-office-viewer`
- Location: `publish/aurochs/` (newly created)
- name: `aurochs` (keep the public package name)
- Output build artifacts to `dist/`

### 3. Only expose specified entry points

- From `@aurochs-renderer/pptx`: `./pptx/renderer/svg`, `./pptx/renderer/ascii`, `./pptx/renderer/mermaid`
- From `@aurochs-ui/pptx-editor`: `./pptx/viewer`
- Future: docx, xlsx can be added with the same pattern

### 4. Enable easy tree-shaking

- Each entry point is built independently
- Unused modules are not included in the bundle

## Reference Pattern

`publish/aurochs-office-viewer`:
- Functions as a publish "container"
- `main: "./dist/extension.js"` points to pre-built output
- Build source is from various packages in the monorepo
- Build is executed by `packages/@aurochs-build/vscode-office-viewer`

## Structure After Changes

```
/ (name="aurochs-workspace") <- Pure monorepo root (private: true)
├── packages/
│   ├── @aurochs-renderer/pptx/   <- Build source (renderer)
│   ├── @aurochs-ui/pptx-editor/  <- Build source (viewer)
│   ├── @aurochs-build/
│   │   ├── aurochs/              <- Build handler (for npm package)
│   │   └── vscode-office-viewer/ <- Build handler (for VS Code extension)
│   └── ...
└── publish/                      <- Publish packages (outside workspaces)
    ├── aurochs/                  <- npm package
    │   ├── package.json (name="aurochs")
    │   └── dist/
    │       └── pptx/
    │           ├── renderer/{svg,ascii,mermaid}/
    │           └── viewer/
    └── aurochs-office-viewer/    <- VS Code extension
        ├── package.json
        └── dist/
```

`publish/` is like `cdk.out`. Not included in workspaces, functions as a place for build artifacts.

### Entry Point Naming Convention

File format comes first: `{format}/{context}/{type}`

- `pptx/renderer/svg` - PPTX SVG renderer
- `pptx/renderer/ascii` - PPTX ASCII renderer
- `pptx/renderer/mermaid` - PPTX Mermaid renderer
- `pptx/viewer` - PPTX viewer

Future expansion examples:
- `docx/renderer/svg` - DOCX SVG renderer
- `docx/viewer` - DOCX viewer
- `xlsx/renderer/svg` - XLSX SVG renderer
- `pptx/editor` - PPTX editor
- `pptx/builder` - PPTX builder

This structure naturally expresses per-format feature differences like "pptx has renderer and viewer" or "docx has viewer only".

## Usage from External Users

```typescript
import { renderSlideToSvg } from 'aurochs/pptx/renderer/svg';
import { renderSlideAscii } from 'aurochs/pptx/renderer/ascii';
import { renderSlideMermaid } from 'aurochs/pptx/renderer/mermaid';
import { PresentationViewer } from 'aurochs/pptx/viewer';
```

## Implementation Steps

1. [x] Create `publish/aurochs/` with publish package.json
2. [x] Change root package.json name to `aurochs-workspace`
3. [x] Exclude publish packages from workspaces
4. [x] Create build config (Vite config builds only specified entry points)
5. [x] Generate type definition files (.d.ts) with vite-plugin-dts
6. [x] Configure exports
7. [x] Move VS Code extension to `publish/aurochs-office-viewer/`
8. [x] Update references in `.vscode/launch.json`, `CLAUDE.md`, etc.
9. [x] CLI build (resolved by adding `./ascii`, `./mermaid` exports to `@aurochs-renderer/docx`)

## Implementation Details

### Build Config (packages/@aurochs-build/aurochs/vite.config.ts)

```typescript
const entries = {
  "pptx/renderer/svg/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/svg/index.ts"),
  "pptx/renderer/ascii/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/ascii/index.ts"),
  "pptx/renderer/mermaid/index": resolve(__dirname, "../../@aurochs-renderer/pptx/src/mermaid/index.ts"),
  "pptx/viewer/index": resolve(__dirname, "../../@aurochs-ui/pptx-editor/src/viewer/index.ts"),
};
```

For future additions, just add to this `entries` object.

### Lint Rule Constraints

- `custom/no-export-star`: `export * from` is prohibited
- `custom/no-cross-package-reexport`: Re-exporting from other packages is prohibited

Due to these constraints, the build package has no source code and directly builds the original package entry points via build scripts.
