/**
 * @file Root webview application component.
 *
 * Listens for messages from the extension host and renders
 * the appropriate viewer based on the message type.
 */

import { useState, useEffect } from "react";
import type { ExtensionToWebviewMessage } from "./types";
import { PptxViewer } from "./viewers/PptxViewer";
import { XlsxViewer } from "./viewers/XlsxViewer";
import { DocxViewer } from "./viewers/DocxViewer";
import { PdfViewer } from "./viewers/PdfViewer";
import { ErrorViewer } from "./viewers/ErrorViewer";






/** Root application component for the VS Code office viewer webview. */
export function App(): React.JSX.Element {
  const [data, setData] = useState<ExtensionToWebviewMessage | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      setData(event.data);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (data === null) {
    return <div className="loading">Loading...</div>;
  }

  switch (data.type) {
    case "pptx":
      return <PptxViewer {...data} />;
    case "xlsx":
      return <XlsxViewer {...data} />;
    case "docx":
      return <DocxViewer {...data} />;
    case "pdf":
      return <PdfViewer {...data} />;
    case "error":
      return <ErrorViewer {...data} />;
  }
}
