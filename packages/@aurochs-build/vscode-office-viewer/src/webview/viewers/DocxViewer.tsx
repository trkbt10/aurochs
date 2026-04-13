/**
 * @file DOCX document viewer.
 */

import { useState } from "react";
import type { DocxDataMessage } from "../types";
import { Toolbar, ToolbarSpacer, ToolbarInfo } from "../components/Toolbar";
import { ZoomControl } from "../components/ZoomControl";






/** Viewer component for rendering DOCX document content as HTML. */
export function DocxViewer({ html, fileName }: DocxDataMessage): React.JSX.Element {
  const [zoom, setZoom] = useState(100);

  return (
    <div className="docx-viewer">
      <Toolbar>
        <ToolbarInfo>{fileName}</ToolbarInfo>
        <ToolbarSpacer />
        <ZoomControl zoom={zoom} min={50} max={200} onZoomChange={setZoom} />
      </Toolbar>
      <div className="docx-content">
        <div
          className="docx-page"
          style={{ transform: `scale(${zoom / 100})` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
