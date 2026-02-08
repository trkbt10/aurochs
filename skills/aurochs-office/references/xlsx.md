# XLSX Reference

## Command details

### info / list / show

```bash
npx aurochs xlsx info book.xlsx                       # Sheet count, sheet names, row count
npx aurochs xlsx list book.xlsx                       # Sheet list (row count summary)
npx aurochs xlsx show book.xlsx Sheet1                # Entire sheet
npx aurochs xlsx show book.xlsx Sheet1 --range A1:E10 # Cell range
npx aurochs xlsx show book.xlsx Sheet1 -o json        # Structured data
```

### extract

```bash
npx aurochs xlsx extract book.xlsx                         # First sheet as CSV
npx aurochs xlsx extract book.xlsx --sheet Sheet2           # Specific sheet
npx aurochs xlsx extract book.xlsx --format json            # JSON output
npx aurochs xlsx extract book.xlsx --sheet Sheet1 -o json   # Combined
```

### Data analysis

```bash
npx aurochs xlsx formulas book.xlsx              # Formula list
npx aurochs xlsx names book.xlsx                 # Named ranges (defined names)
npx aurochs xlsx strings book.xlsx               # Shared strings (including rich text formatting)
```

### Structure & formatting

```bash
npx aurochs xlsx tables book.xlsx                # Table definitions (ListObjects)
npx aurochs xlsx comments book.xlsx              # Cell comments
npx aurochs xlsx hyperlinks book.xlsx            # Hyperlinks
npx aurochs xlsx autofilter book.xlsx            # AutoFilter settings
npx aurochs xlsx validation book.xlsx            # Data validation rules
npx aurochs xlsx conditional book.xlsx           # Conditional formatting rules
npx aurochs xlsx styles book.xlsx                # Fonts, fills, borders, number formats
```

### preview

```bash
npx aurochs xlsx preview book.xlsx                          # All sheets
npx aurochs xlsx preview book.xlsx Sheet1                   # Specific sheet
npx aurochs xlsx preview book.xlsx Sheet1 --range A1:E10    # Specific range
npx aurochs xlsx preview book.xlsx --width 120              # Specify width
```

---

## Build spec

```jsonc
{
  "template": "./template.xlsx",
  "output": "./output.xlsx",
}
```

Copies the template to output. Content editing is done manually while inspecting the structure with inspection commands.

---

## Typical workflow

```bash
# Understand sheet structure
npx aurochs xlsx info book.xlsx
npx aurochs xlsx list book.xlsx

# View data
npx aurochs xlsx show book.xlsx Sheet1 --range A1:E10
npx aurochs xlsx preview book.xlsx Sheet1
npx aurochs xlsx extract book.xlsx --format json

# Inspect formulas & rules
npx aurochs xlsx formulas book.xlsx
npx aurochs xlsx validation book.xlsx
npx aurochs xlsx conditional book.xlsx

# Check styles
npx aurochs xlsx styles book.xlsx
```
