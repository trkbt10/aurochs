# aurochs

Toolkit for parsing, manipulating, and visualizing Office documents (XLSX / DOCX / PPTX).

Inspect files from the CLI, edit programmatically with JSON specs, embed viewers in React apps.

## Install

```bash
npm install aurochs
```

---

## CLI

```bash
npx aurochs <format> <command> [options]
```

### XLSX (Spreadsheets)

```bash
# Inspect
aurochs xlsx info book.xlsx            # Sheet count, row count, style counts
aurochs xlsx show book.xlsx Sheet1     # Display sheet as table
aurochs xlsx preview book.xlsx         # Terminal preview

# Analyze
aurochs xlsx formulas book.xlsx        # List formulas
aurochs xlsx names book.xlsx           # Named ranges
aurochs xlsx validation book.xlsx      # Data validation rules

# Edit
aurochs xlsx build spec.json           # Create or modify from JSON spec
```

### DOCX (Word Documents)

```bash
# Inspect
aurochs docx info report.docx          # Paragraph count, table count, sections
aurochs docx extract report.docx       # Extract text
aurochs docx preview report.docx       # Terminal preview

# Structure
aurochs docx styles report.docx        # List styles
aurochs docx numbering report.docx     # Numbering definitions
aurochs docx tables report.docx        # Table structure

# Edit
aurochs docx build spec.json           # Create new document
aurochs docx patch spec.json           # Patch existing document
```

### PPTX (Presentations)

```bash
# Inspect
aurochs pptx info deck.pptx            # Slide count, dimensions
aurochs pptx list deck.pptx            # List slides
aurochs pptx show deck.pptx 1          # List shapes on slide

# Analyze
aurochs pptx extract deck.pptx         # Extract text
aurochs pptx images deck.pptx          # List images
aurochs pptx tables deck.pptx          # List tables
aurochs pptx diff a.pptx b.pptx        # Compare two files

# Preview
aurochs pptx preview deck.pptx         # ASCII art preview

# Edit
aurochs pptx build spec.json           # Create new presentation
aurochs pptx patch spec.json           # Patch existing presentation
```

---

## Library API

### `aurochs/pptx/renderer/svg`

Render slides to SVG strings.

```ts
import { renderSlideToSvg } from "aurochs/pptx/renderer/svg";

const svg = renderSlideToSvg(slide, theme, { width: 960, height: 540 });
```

Exports:
- `renderSlideToSvg`, `renderSlideSvg` — slide to SVG
- `renderGeometryPathData` — shape geometry paths
- `renderFillToStyle`, `renderLineToStyle` — fill/stroke styles
- SVG primitives (`svg`, `g`, `rect`, `path`, `text`, ...)

### `aurochs/pptx/renderer/ascii`

Render slides to ASCII art for terminal display.

```ts
import { renderSlideAscii } from "aurochs/pptx/renderer/ascii";

const ascii = renderSlideAscii(slide, { width: 80, height: 24 });
console.log(ascii);
```

### `aurochs/pptx/renderer/mermaid`

Convert slides to Mermaid diagram syntax.

```ts
import { renderSlideMermaid } from "aurochs/pptx/renderer/mermaid";

const mermaid = renderSlideMermaid(slide);
```

### `aurochs/pptx/viewer`

React components for embedding presentation viewers.

```tsx
import { PresentationSlideshow } from "aurochs/pptx/viewer";

<PresentationSlideshow
  slides={slides}
  onSlideChange={(index) => console.log(index)}
/>
```

Components:
- `PresentationSlideshow` — fullscreen presentation playback
- `PresentationViewer` — viewer with thumbnail navigation
- `EmbeddableSlide` — single slide embed
- `SlideShareViewer` — paginated slide browser

Supports React 18/19. `react` and `react-dom` are optional peer dependencies.
