/**
 * @file VSCode Extension Entry Point
 *
 * Registers custom readonly editor providers for PPTX, DOCX, and XLSX files.
 */

import * as vscode from "vscode";
import { PPTX_VIEW_TYPE, createPptxEditorProvider } from "./providers/pptx-provider";
import { DOCX_VIEW_TYPE, createDocxEditorProvider } from "./providers/docx-provider";
import { XLSX_VIEW_TYPE, createXlsxEditorProvider } from "./providers/xlsx-provider";

/**
 * Activate the extension by registering all custom editor providers.
 */
export function activate(context: vscode.ExtensionContext): void {
  const editorOptions = { supportsMultipleEditorsPerDocument: true };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      PPTX_VIEW_TYPE,
      createPptxEditorProvider(),
      editorOptions,
    ),
  );

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      DOCX_VIEW_TYPE,
      createDocxEditorProvider(),
      editorOptions,
    ),
  );

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      XLSX_VIEW_TYPE,
      createXlsxEditorProvider(),
      editorOptions,
    ),
  );
}

/**
 * Deactivate the extension.
 */
export function deactivate(): void {
  // Nothing to clean up
}
