/**
 * @file Root webview application component.
 *
 * Listens for messages from the extension host and renders
 * the appropriate viewer based on the message type.
 */

import { useState, useEffect } from "react";
import type { ExtensionToWebviewMessage, PdfPageResponseMessage } from "./types";

/** Messages that determine which viewer to show (excludes streaming page data). */
type ViewerInitMessage = Exclude<ExtensionToWebviewMessage, PdfPageResponseMessage>;
import { PptxViewer } from "./viewers/PptxViewer";
import { XlsxViewer } from "./viewers/XlsxViewer";
import { DocxViewer } from "./viewers/DocxViewer";
import { PdfViewer, PdfIncrementalViewer } from "./viewers/PdfViewer";
import { ErrorViewer } from "./viewers/ErrorViewer";






/** Root application component for the VS Code office viewer webview. */
export function App(): React.JSX.Element {
  const [data, setData] = useState<ViewerInitMessage | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data as ExtensionToWebviewMessage;
      // Only handle document-level messages that determine which viewer to show.
      // Per-page messages (pdfPage) are handled by PdfIncrementalViewer directly.
      if (msg.type === "pdfPage") {
        return;
      }
      setData(msg as ViewerInitMessage);
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
    case "pdfMeta":
      return <PdfIncrementalViewer {...data} />;
    case "error":
      return <ErrorViewer {...data} />;
  }
}
