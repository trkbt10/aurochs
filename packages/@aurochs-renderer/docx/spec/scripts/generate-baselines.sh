#!/bin/bash
# Generate baseline PNGs from all DOCX fixtures using LibreOffice
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(dirname "$SCRIPT_DIR")"

generate_baseline() {
  local docx_file="$1"
  local png_file="${docx_file%.docx}.png"
  local basename=$(basename "$docx_file" .docx)
  local temp_dir=$(mktemp -d)

  echo "Generating: $png_file"
  soffice --headless --convert-to pdf:writer_pdf_Export --outdir "$temp_dir" "$docx_file" 2>/dev/null
  pdftoppm -png -r 96 -singlefile "$temp_dir/$basename.pdf" "${png_file%.png}"
  rm -rf "$temp_dir"
}

# Find all .docx files in fixtures directories
find "$SPEC_DIR" -path "*/fixtures/*.docx" | while read -r docx; do
  generate_baseline "$docx"
done

echo "Done."
