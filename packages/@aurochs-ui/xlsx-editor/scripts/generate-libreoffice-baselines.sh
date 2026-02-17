#!/bin/bash
#
# Generate LibreOffice Calc baseline screenshots for visual regression tests
#
# Prerequisites:
#   - LibreOffice installed (brew install --cask libreoffice)
#   - poppler installed (brew install poppler) - for pdftoppm
#   - ImageMagick installed (brew install imagemagick) - optional, for resize
#
# Usage:
#   ./packages/@aurochs-ui/xlsx-editor/scripts/generate-libreoffice-baselines.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/../fixtures/visual"
XLSX_DIR="$FIXTURES_DIR/xlsx"
BASELINE_DIR="$FIXTURES_DIR/baseline"
TEMP_DIR="$FIXTURES_DIR/.tmp"

# Check for LibreOffice
if ! command -v soffice &> /dev/null; then
  echo "Error: LibreOffice not found. Install with: brew install --cask libreoffice"
  exit 1
fi

# Check for pdftoppm (from poppler)
if ! command -v pdftoppm &> /dev/null; then
  echo "Error: pdftoppm not found. Install with: brew install poppler"
  exit 1
fi

# Create directories
mkdir -p "$BASELINE_DIR"
mkdir -p "$TEMP_DIR"

echo "Generating LibreOffice baselines..."
echo ""

# Process each XLSX file
for xlsx_file in "$XLSX_DIR"/*.xlsx; do
  if [ ! -f "$xlsx_file" ]; then
    continue
  fi

  filename=$(basename "$xlsx_file" .xlsx)
  echo "Processing: $filename"

  # Convert XLSX to PDF using LibreOffice headless
  echo "  Converting to PDF..."
  soffice --headless --convert-to pdf --outdir "$TEMP_DIR" "$xlsx_file" > /dev/null 2>&1 || {
    echo "  Warning: PDF conversion failed for $filename"
    continue
  }

  pdf_file="$TEMP_DIR/$filename.pdf"
  if [ ! -f "$pdf_file" ]; then
    echo "  Warning: PDF not created for $filename"
    continue
  fi

  # Convert PDF to PNG using pdftoppm (from poppler)
  # -png for PNG output, -r 150 for 150 DPI, -f 1 -l 1 for first page only
  echo "  Converting to PNG..."
  pdftoppm -png -r 150 -f 1 -l 1 -singlefile "$pdf_file" "$TEMP_DIR/$filename" || {
    echo "  Warning: PNG conversion failed for $filename"
    continue
  }

  temp_png="$TEMP_DIR/$filename.png"
  png_file="$BASELINE_DIR/$filename.png"

  if [ ! -f "$temp_png" ]; then
    echo "  Warning: PNG not created for $filename"
    continue
  fi

  # Resize to viewport size (800x600) using magick or sips
  echo "  Resizing to 800x600..."
  if command -v magick &> /dev/null; then
    magick "$temp_png" -resize 800x600! "$png_file"
  elif command -v sips &> /dev/null; then
    # macOS built-in tool
    cp "$temp_png" "$png_file"
    sips -z 600 800 "$png_file" > /dev/null 2>&1
  else
    # Just copy without resize
    cp "$temp_png" "$png_file"
    echo "  Warning: No resize tool found (magick/sips), using original size"
  fi

  echo "  Created: $png_file"
done

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "Done! Baselines created in: $BASELINE_DIR"
echo ""
echo "Note: These baselines are generated from LibreOffice PDF export."
echo "For pixel-perfect comparison, you may need to manually capture screenshots"
echo "from LibreOffice Calc at 800x600 viewport size."
