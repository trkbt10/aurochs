---
name: aurochs-office
description: |
  Inspect, build, and verify Office documents (PPTX, DOCX, XLSX) using the aurochs CLI.
  Use this skill when: (1) Inspecting existing Office files, (2) Building PPTX/DOCX/XLSX from JSON spec,
  (3) Previewing slide/document/sheet content in terminal, (4) Extracting text or data,
  (5) Verifying build results, (6) User asks about ".pptx", ".docx", ".xlsx" inspection or generation.
---

# Aurochs Office

Operate Office documents with the `aurochs` CLI. Runs on the Bun runtime.

## Have a file → What can you do?

### Have a PPTX file

| Task                        | Command                                        |
| --------------------------- | ---------------------------------------------- |
| Check slide count & size    | `npx aurochs pptx info <file>`                 |
| List slides                 | `npx aurochs pptx list <file>`                 |
| View slide content          | `npx aurochs pptx show <file> <n>`             |
| Extract text                | `npx aurochs pptx extract <file>`              |
| Check theme colors & fonts  | `npx aurochs pptx theme <file>`                |
| ASCII preview               | `npx aurochs pptx preview <file> [n] --border` |
| Build from template         | `npx aurochs pptx build <spec.json>`           |
| Verify build result         | `npx aurochs pptx verify <path>`               |

> Details: `references/pptx.md`

### Have a DOCX file

| Task                          | Command                                            |
| ----------------------------- | -------------------------------------------------- |
| Document metadata             | `npx aurochs docx info <file>`                     |
| List sections                 | `npx aurochs docx list <file>`                     |
| Section content               | `npx aurochs docx show <file> <n>`                 |
| Extract text                  | `npx aurochs docx extract <file>`                  |
| Check styles                  | `npx aurochs docx styles <file>`                   |
| Table of contents             | `npx aurochs docx toc <file>`                      |
| Tables / images / comments    | `npx aurochs docx tables\|images\|comments <file>` |
| ASCII preview                 | `npx aurochs docx preview <file> [n]`              |

> Details: `references/docx.md`

### Have an XLSX file

| Task                                  | Command                                               |
| ------------------------------------- | ----------------------------------------------------- |
| Workbook info                         | `npx aurochs xlsx info <file>`                        |
| List sheets                           | `npx aurochs xlsx list <file>`                        |
| Sheet content                         | `npx aurochs xlsx show <file> <sheet> --range A1:E10` |
| Extract data (CSV/JSON)               | `npx aurochs xlsx extract <file> --format json`       |
| Formulas / named ranges               | `npx aurochs xlsx formulas\|names <file>`             |
| Conditional formatting / validation   | `npx aurochs xlsx conditional\|validation <file>`     |
| ASCII preview                         | `npx aurochs xlsx preview <file> [sheet]`             |

> Details: `references/xlsx.md`

## Common patterns

```bash
# JSON output (parseable structured data)
npx aurochs pptx show deck.pptx 1 -o json

# Extract specific range
npx aurochs pptx extract deck.pptx --slides 1,3-5
npx aurochs docx extract doc.docx --sections 1,3-5
```

## Want to build → How?

Only PPTX supports full JSON spec-based building (DOCX/XLSX use template copy).

```bash
# 1. Inspect the template
npx aurochs pptx show template.pptx 1 -o json
npx aurochs pptx theme template.pptx

# 2. Create spec.json (→ see Build spec in references/pptx.md)

# 3. Build → verify
npx aurochs pptx build spec.json
npx aurochs pptx preview output.pptx --border
```
