#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEV_EXTENSION_PATH="$ROOT_DIR/publish/aurochs-office-viewer"
BUILD_PKG_DIR="$ROOT_DIR/packages/@aurochs-build/vscode-office-viewer"
USER_DATA_DIR="/tmp/ov-dev-user"
EXTENSIONS_DIR="/tmp/ov-dev-exts"

TARGET_FILE="${1:-$ROOT_DIR/fixtures/samples/k-namingrule-dl.pdf}"

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is required." >&2
  exit 1
fi

if ! command -v code >/dev/null 2>&1; then
  echo "Error: VS Code CLI 'code' is required." >&2
  exit 1
fi

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "Error: target file not found: $TARGET_FILE" >&2
  exit 1
fi

echo "[1/3] Building office viewer extension..."
bun run --cwd "$BUILD_PKG_DIR" build

echo "[2/3] Resetting isolated VS Code profile..."
rm -rf "$USER_DATA_DIR" "$EXTENSIONS_DIR"
mkdir -p "$USER_DATA_DIR/User"
cat > "$USER_DATA_DIR/User/settings.json" <<'JSON'
{
  "workbench.editorAssociations": {
    "*.pdf": "aurochs.pdfViewer",
    "*.pptx": "aurochs.pptxViewer",
    "*.ppt": "aurochs.pptxViewer",
    "*.docx": "aurochs.docxViewer",
    "*.doc": "aurochs.docxViewer",
    "*.xlsx": "aurochs.xlsxViewer",
    "*.xls": "aurochs.xlsxViewer"
  }
}
JSON

echo "[3/3] Launching VS Code with development extension..."
code \
  --user-data-dir "$USER_DATA_DIR" \
  --extensions-dir "$EXTENSIONS_DIR" \
  --extensionDevelopmentPath="$DEV_EXTENSION_PATH" \
  "$ROOT_DIR" \
  "$TARGET_FILE"
