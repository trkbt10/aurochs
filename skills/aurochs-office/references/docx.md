# DOCX Reference

## Command details

### info / list / show

```bash
npx aurochs docx info report.docx           # Paragraph count, table count, section count
npx aurochs docx list report.docx           # Section list (paragraph count summary)
npx aurochs docx show report.docx 1         # Section content
npx aurochs docx show report.docx 1 -o json # Structured data
```

### extract

```bash
npx aurochs docx extract report.docx                  # All text
npx aurochs docx extract report.docx --sections 1,3-5 # Specific sections
npx aurochs docx extract report.docx -o json           # JSON format
```

### styles

```bash
npx aurochs docx styles report.docx                    # All styles
npx aurochs docx styles report.docx --type paragraph   # Paragraph styles only
npx aurochs docx styles report.docx --type character   # Character styles only
npx aurochs docx styles report.docx --type table       # Table styles only
npx aurochs docx styles report.docx --all              # Including hidden styles
```

### Structure commands

```bash
npx aurochs docx numbering report.docx        # Numbering definitions (lists/bullets)
npx aurochs docx headers-footers report.docx   # Headers/footers
npx aurochs docx tables report.docx            # Table structure
npx aurochs docx comments report.docx          # Comments
npx aurochs docx images report.docx            # Embedded image info
npx aurochs docx toc report.docx               # Table of contents (outline level based)
```

### preview

```bash
npx aurochs docx preview report.docx             # All sections
npx aurochs docx preview report.docx 1            # Specific section
npx aurochs docx preview report.docx --width 120  # Specify width
```

---

## Build spec

```jsonc
{
  "template": "./template.docx",
  "output": "./output.docx",
}
```

Copies the template to output. Content editing is done manually while inspecting the structure with inspection commands.

---

## Typical workflow

```bash
# Understand document structure
npx aurochs docx info report.docx
npx aurochs docx list report.docx
npx aurochs docx toc report.docx

# Inspect styles and formatting
npx aurochs docx styles report.docx --type paragraph
npx aurochs docx numbering report.docx

# View content
npx aurochs docx show report.docx 1 -o json
npx aurochs docx tables report.docx
npx aurochs docx preview report.docx
```
