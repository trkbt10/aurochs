# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.12.1] - 2026-04-13

### Changed

- Move INSTANCE resolution SoT (symbol-resolver, symbol-pre-resolver, guid-translation, constraints) from `@aurochs-renderer/fig` to `@aurochs/fig/symbols` for shared access across renderer and converters
- Fig-to-PPTX TEXT node fills now map to run-level text color instead of shape background fill
- Fig-to-PPTX layout scaling uses grpSp childExtent/extent ratio (SVG viewBox equivalent) instead of per-property rewriting
- Fig-to-PPTX autoFit set to none — Figma's computed box sizes are preserved as-is

### Added

- Fig-to-PPTX lineHeight conversion to ParagraphProperties.lineSpacing
- Fig-to-PPTX letterSpacing conversion to RunProperties.spacing
- Fig-to-PPTX textCase conversion to RunProperties.caps (UPPER/SMALL_CAPS)
- Fig-to-PPTX node opacity multiplied into fill/stroke alpha
- Fig-to-PPTX strokeAlign (INSIDE/CENTER) mapped to DrawingML line alignment

### Fixed

- Fig-to-PPTX INSTANCE resolution now uses canonical SoT from `@aurochs/fig/symbols` instead of separate re-implementation
- Fig-to-PPTX shape ID collision with spTree root (IDs now start at 2)
- Fig-to-PPTX gradient crash when gradientHandlePositions is undefined

## [0.12.0] - 2026-04-13

### Added

- Fig (Figma) editor with page list, property panels, fill/stroke/transform sections, drill-down selection, duplication, and text editing with cursor and selection handling
- Fig CLI (`aurochs fig`) with commands for extracting, previewing, and displaying fig file content
- PPTX-to-Fig converter with comprehensive shape and text handling
- `@aurochs/dsv` package for CSV, TSV, and JSONL parsing/building
- PDF function parsing and evaluation engine
- PDF `PdfTextBlock` for grouped text elements
- PDF `PdfSourceContext`, `PdfRenderSession`, and deferred image cache
- PDF `FontProvider` as central font resolution layer
- PDF pattern color resolution and shading support
- PDF encryption handling with auto mode and optional encryption in load options
- Text auto-resize and clipping behavior in TextNodeRenderer
- Multi-format conversion support and enhanced conversion API
- Gradient editor components for fill/stroke editing
- WebGL texture cache management and tessellation tests
- Symbol font detection and enhanced font metrics handling
- Rotation transform for path elements in SVG rendering
- Component properties section and blend mode handling in design nodes
- Shape spec builder with typed state management and fluent API
- E2E testing configuration with Vite setup for TextEditController

### Changed

- Fig domain types established in `@aurochs/fig` with enforced dependency direction
- Drag state separated into `FigDragContext` for performance optimization
- Styles migrated from CSS modules to inline styles using design tokens
- XLSX sheet established as single source of truth for rendering
- XLSX hardcoded dimensions replaced with constants
- VBA editor migrated to `CodeEditor` from `react-editor-ui`
- MCP UI migrated from `dangerouslySetInnerHTML` to `SlideRenderer`
- SVG string pipeline replaced with React component rendering for thumbnails
- Color resolver imports updated to use domain layer
- Matrix handling and path command structures refactored
- Paint handling in shape builders refactored to support multiple paint types

### Fixed

- All lint errors and warnings resolved, TypeScript compilation errors fixed
- PDF default fill and stroke colors in rasterization
- CLI build updated to use `--outdir` with `--entry-naming` for native asset compatibility

## [0.11.0] - 2026-04-10

### Added

- Unified file-to-Markdown conversion via `aurochs -i <file> [-o <file>]` (ffmpeg-style interface)
- Support for PPTX, XLSX, DOCX, PDF input with automatic format detection from file extension
- Transparent legacy format conversion: PPT, XLS, DOC are converted in-memory before Markdown output
- PDF Markdown renderer with text line grouping, heading detection from font size, and bold/italic formatting
- `convertToMarkdown()` programmatic API exported from `@aurochs-cli/cli`

### Fixed

- Unified commander dependency to ^14.0.3 across all CLI packages (pdf-cli was on ^12.1.0)

## [0.10.0] - 2026-04-10

### Added

- XLSX autoFilter evaluation engine with ECMA-376 §18.3.2 compliant filter evaluation (filters, customFilters, top10, dynamicFilter)
- XLSX row sorting with Excel-standard type ordering (number < text < boolean < error < empty) per §18.3.1.92
- XLSX autoFilter column data type inference (text/number/date/mixed) for adaptive UI
- XLSX autoFilter Excel-style dropdown panel with type-adaptive sort labels, inline operator+value condition rows, And/Or toggle, search box, value checklist, Auto Apply, and Clear Filter
- XLSX autoFilter button overlay on header row cells (matching Excel placement) with independent z-index layer
- XLSX autoFilter mutations: setFilterColumn with automatic row visibility recalculation, applySort with sortState update, clearAllFilters
- XLSX autoFilter reducer actions: SET_FILTER_COLUMN, APPLY_SORT, CLEAR_ALL_FILTERS
- XLSX autoFilter menu configuration mapping column data types to ECMA-376 filter structures (customFilter wildcards §18.3.2.1, top10 §18.3.2.10, dynamicFilter date types §18.18.26)
- `dateGroupItems` field to `XlsxFilters` type for date hierarchy filtering per §18.3.2.4

### Fixed

- `XlsxColorFilter` spec reference corrected from non-existent §18.3.2.0 to OOXML extension reference
- `XlsxIconFilter` removed incorrect "(extension)" label (§18.3.2.6 is a standard element)
- Cell wrapText rendering: use `pre-wrap` instead of `normal` to preserve literal newlines

### Changed

- ECMA-376 section references added to all autoFilter domain modules (evaluator, sort, column-type, menu-config) with per-function `@see` annotations
- AutoFilter SoT documented: UI delegates to domain layer modules for all filter/sort logic

## [0.9.0] - 2026-03-24

### Added

- PPTX domain types export (`aurochs/pptx/domain`) for type-safe PPTX content access
- DOCX domain types export (`aurochs/docx/domain`) for type-safe DOCX content access
- DOCX builder export (`aurochs/docx/builder`) with `buildDocx` / `patchDocx` APIs
- OOXML shared domain export (`aurochs/ooxml/domain`) with ResourceStore and shared types
- XLSX patcher: `customWidth`, `mergeCells` support, and column mutations
- XLSX row mutation operations: insert, delete, hide, unhide, set height, outline level
- Chart rendering and editing integration in PPTX editor
- Diagram rendering enhancement in PPTX editor
- PDF document mutation operations and element transformations
- PDF editor shared infrastructure with canvas and viewport support

### Changed

- ResourceStore promoted to OOXML shared layer (`@aurochs-office/ooxml`) as single source of truth
- ResourceResolver eliminated in favor of unified ResourceStore interface
- Slide resource preparation and registration logic streamlined
- Media handling and MIME type detection streamlined
- Color-editor UI replaced with shared `react-editor-ui` components

### Fixed

- Stale `resource-store` export removed from PPTX package (moved to OOXML)
- Missing `text-utils` and `text-style-levels` explicit exports in PPTX package
- Broken `cell/query` import path in XLSX editor components
- Unnecessary optional chaining on required `resourceStore` field removed

## [0.8.0] - 2026-03-22

### Added

- PPTX editor packages: slide canvas, viewer, and editor components
- PPTX viewer with swipe navigation and keyboard controls for slide navigation
- PPTX theme editing capabilities and slide color mapping
- PPTX image placement support in slide editor
- XLSX domain and builder exports to npm package
- XLSX workbook patcher moved to `@aurochs-builder/xlsx` with drawing support
- Drawing serialization and export functionality
- Font scheme handling with `EMPTY_FONT_SCHEME` (ECMA-376 §20.1.6.10)
- Theme XML generation (`buildThemeXml`) with round-trip tests
- AssetPanel sharing and centralized theme/layout UI components
- Custom ESLint rules: `no-type-alias-reexport`, `no-cross-package-reexport`
- PDF editor page with canvas, viewport, and text editing support
- Unified editor infrastructure: `editor-controls`, `editor-core` packages
- Unified text formatting, table operations, and page size editing across PPTX/PDF/DOCX editors

### Changed

- Replaced `XmlElement` with domain types in FormatScheme and defaultTextStyle
- Background handling refactored to use parsed domain types
- Theme import/export enforces single source of truth with OOXML serialization
- Text alignment UI components unified, mixed prop anti-pattern eliminated
- Inspector sections unified to `OptionalPropertySection`
- Font resolution replaced Google Fonts catalog with Local Font Access API
- All lint errors and warnings resolved (2500+ issues fixed across 455 files)

### Removed

- Line editing components from pptx-editors package
- `xml-utils` consolidated into XML mutation logic
- `masterTextStyles` removed from slide-related structures

## [0.7.0] - 2026-03-13

### Added

- PPTX React renderer export (`aurochs/pptx/renderer/react`) for custom UI composition
- PPTX animation engine export (`aurochs/pptx/renderer/animation`) for programmatic animation control
- PPTX render-options export (`aurochs/pptx/renderer/render-options`) for SVG rendering customization
- DOCX React renderer export (`aurochs/docx/renderer/react`) for custom UI composition
- DOCX render-options export (`aurochs/docx/renderer/render-options`) for SVG rendering customization

### Fixed

- Missing dependencies in `@aurochs-build/aurochs` for DOCX, XLSX, and PDF packages

## [0.6.4] - 2026-03-06

### Added

- PDF: auto-decode TextRun.text to Unicode at parse time using ToUnicode/fontInfo
- PDF: rawText and codeByteWidth fields for safe translation round-trip

## [0.6.0] - 2026-03-05

### Added

- PDF rendering pipeline with SVG/React output and VS Code custom editor
- PDF writer for serializing PdfDocument to binary format
- pdf-cli package integrated into unified `aurochs pdf` command
- PDF exports to aurochs npm package (parser, renderer, viewer)
- Vertical text rendering support in PDF viewer
- VBA project serializer with CFB writer for round-trip editing
- VBA editor with search/replace, IntelliSense, and multi-renderer support
- VBA text decoding for multiple code pages including Japanese encoding
- VBA execution preview with macro creation support
- Unified content extraction API for Office documents
- Visual regression test infrastructure for PPTX/DOCX/XLSX editors
- UI preview system with Player component and Storybook-like stories
- Viewer pages for DOCX and XLSX

### Fixed

- PDF: render clipped images reliably in Chromium
- PDF: improve SVG image compatibility in webviews
- PDF: align table inner grid with detected rule lines
- PDF: handle encrypted ObjStm streams
- XLSX: correct Excel date serial conversion with Lotus 1-2-3 bug handling
- VBA: module type detection for document, class, and UserForm modules

### Changed

- PDF builder source of truth moved to @aurochs-builder/pdf
- PDF block segmentation modules reorganized for corpus-driven processing
- VBA editor restructured with design tokens and cursor-based execution

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

[Unreleased]: https://github.com/trkbt10/aurochs/compare/v0.12.1...HEAD
[0.12.1]: https://github.com/trkbt10/aurochs/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/trkbt10/aurochs/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/trkbt10/aurochs/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/trkbt10/aurochs/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/trkbt10/aurochs/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/trkbt10/aurochs/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/trkbt10/aurochs/compare/v0.6.4...v0.7.0
[0.6.4]: https://github.com/trkbt10/aurochs/compare/v0.6.0...v0.6.4
[0.6.0]: https://github.com/trkbt10/aurochs/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/trkbt10/aurochs/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/trkbt10/aurochs/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/trkbt10/aurochs/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/trkbt10/aurochs/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/trkbt10/aurochs/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/trkbt10/aurochs/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/trkbt10/aurochs/commits/v0.1.0
