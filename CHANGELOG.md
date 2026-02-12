# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-02-12

### Added

- Mobile touch/swipe navigation with animation step control in viewer
- `--format svg` option for DOCX and XLSX preview CLI commands
- `renderDocumentToSvg` high-level API for DOCX
- DOCX exports to aurochs npm package: parser, renderer/svg, renderer/ascii, renderer/mermaid, viewer
- XLSX exports to aurochs npm package: parser, renderer/svg, renderer/ascii, renderer/mermaid, viewer
- DrawingML BlipFill support for image fills with stretch/tile modes and srcRect cropping
- DrawingML rendering components for DOCX (shapes, pictures, diagrams)
- DOCX builder extensions for run, table, and section specs
- Chart visual regression test infrastructure
- XLSX SVG rendering support with single source of truth refactoring

### Changed

- Unified BlipFill type across PPTX and DrawingML packages
- Comprehensive visual regression tests for DOCX renderer

## [0.4.0] - 2026-02-11

### Added

- PPTX parser export to aurochs npm package
- README for aurochs npm package

## [0.3.2] - 2026-02-11

### Fixed

- CI: use npx for vsce package command

## [0.3.1] - 2026-02-11

### Fixed

- CI: fix typecheck and skip lint in CI

## [0.3.0] - 2026-02-11

### Added

- DOCX/XLSX viewer modules with shared UI components
- PPTX slideshow and viewer previews
- PPTX SVG output format to preview command
- VS Code extension for Office file viewing
- CI and release workflows
- ECMA-376 fixture-based visual regression tests for DOCX

### Changed

- Redesigned demo section with card-based UI for viewer/editor access
- Separated publish packages from monorepo workspaces
- Consolidated PPTX preview into viewer module
- Replaced CSS transitions with JS-based animation effects in PPTX

### Fixed

- XLSX CLI: use system temp dir for integration test output
- PDF: eliminated all lint warnings with functional patterns

## [0.2.0] - 2026-02-11

Initial development phase. Core rendering and editing infrastructure.

### Added

- PPTX editor with shape selection, grouping, alignment, and distribution
- Text editing with cursor positioning and overlay
- Drag preview for move, resize, and rotate operations
- Property panels for shapes, charts, and tables
- Color picker with fill/stroke editing
- SVG rendering primitives for strokes, text, and gradients
- Design tokens for consistent styling
- Context menu with z-order and alignment actions
- Slide management (add, delete, reorder, duplicate)
- Layout shapes and placeholder rendering

### Changed

- Unified render context structure across renderers
- Centralized color conversion API

## [0.1.0] - 2026-02-11

Project inception.

### Added

- PPTX/XLSX/DOCX parsers
- SVG renderer for PPTX
- Basic slide viewer and slideshow components
- Chart rendering (bar, line, pie, scatter, area, etc.)
- Shape rendering (rectangles, circles, arrows, connectors)
- Text body and paragraph rendering
- Theme and style support

[Unreleased]: https://github.com/trkbt10/aurochs/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/trkbt10/aurochs/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/trkbt10/aurochs/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/trkbt10/aurochs/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/trkbt10/aurochs/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/trkbt10/aurochs/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/trkbt10/aurochs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/trkbt10/aurochs/commits/v0.1.0
