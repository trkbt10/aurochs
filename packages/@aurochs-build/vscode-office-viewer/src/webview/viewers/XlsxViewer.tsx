/**
 * @file XLSX spreadsheet viewer with sheet tabs.
 */

import { useState } from "react";
import type { XlsxDataMessage } from "../types";
import { Toolbar, ToolbarSpacer, ToolbarInfo } from "../components/Toolbar";
import { ZoomControl } from "../components/ZoomControl";

export function XlsxViewer({ sheets, fileName }: XlsxDataMessage): React.JSX.Element {
  const [currentSheet, setCurrentSheet] = useState(0);
  const [zoom, setZoom] = useState(100);

  return (
    <div className="xlsx-viewer">
      <Toolbar>
        <ToolbarInfo>
          {fileName} &mdash; {sheets.length} sheet{sheets.length !== 1 ? "s" : ""}
        </ToolbarInfo>
        <ToolbarSpacer />
        <ZoomControl zoom={zoom} min={50} max={200} onZoomChange={setZoom} />
      </Toolbar>
      <div
        className="xlsx-content"
        style={{ transform: `scale(${zoom / 100})` }}
        dangerouslySetInnerHTML={{ __html: sheets[currentSheet].html }}
      />
      <div className="sheet-tabs">
        {sheets.map((sheet, i) => (
          <button
            key={i}
            className={`sheet-tab${i === currentSheet ? " active" : ""}`}
            onClick={() => setCurrentSheet(i)}
          >
            {sheet.name}
          </button>
        ))}
      </div>
    </div>
  );
}
