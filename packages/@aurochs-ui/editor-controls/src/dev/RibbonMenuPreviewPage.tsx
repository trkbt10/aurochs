/**
 * @file Ribbon menu preview page
 *
 * RibbonMenu コンポーネントの動作確認。
 * ページはデータ定義と RibbonMenu の配置のみ。
 */

import { useState, useCallback, type CSSProperties } from "react";
import { RibbonMenu } from "../ribbon-menu";
import type { RibbonMenuItemDef, RibbonTabDef } from "../ribbon-menu";
import {
  BoldIcon, ItalicIcon, UnderlineIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
  StrikethroughIcon, ListIcon, ListOrderedIcon,
} from "@aurochs-ui/ui-components/icons";
import { Input } from "@aurochs-ui/ui-components/primitives/Input";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";

// =============================================================================
// Data
// =============================================================================

const ITEM_REGISTRY: Record<string, RibbonMenuItemDef> = {
  bold: { id: "bold", label: "Bold", icon: <BoldIcon size={16} /> },
  italic: { id: "italic", label: "Italic", icon: <ItalicIcon size={16} /> },
  underline: { id: "underline", label: "Underline", icon: <UnderlineIcon size={16} /> },
  strikethrough: { id: "strikethrough", label: "Strikethrough", icon: <StrikethroughIcon size={16} /> },
  "align-left": { id: "align-left", label: "Align Left", icon: <AlignLeftIcon size={16} /> },
  "align-center": { id: "align-center", label: "Align Center", icon: <AlignCenterIcon size={16} /> },
  "align-right": { id: "align-right", label: "Align Right", icon: <AlignRightIcon size={16} /> },
  "bullet-list": { id: "bullet-list", label: "Bullet List", icon: <ListIcon size={16} /> },
  "numbered-list": { id: "numbered-list", label: "Numbered List", icon: <ListOrderedIcon size={16} /> },
  "font-family": { id: "font-family", label: "Font Family", icon: <span style={{ fontSize: 12 }}>Aa</span>, renderWidget: (exec) => <Input value="Arial" onChange={() => exec("font-family")} style={{ width: 100, height: 22 }} /> },
  "font-size": { id: "font-size", label: "Font Size", icon: <span style={{ fontSize: 12 }}>12</span>, renderWidget: (exec) => <Input value="12" onChange={() => exec("font-size")} style={{ width: 40, height: 22, textAlign: "center" }} /> },
  "font-color": { id: "font-color", label: "Font Color", icon: <span style={{ fontSize: 12, color: "#c00" }}>A</span>, renderWidget: (exec) => <ColorPickerPopover value="cc0000" onChange={() => exec("font-color")} /> },
};

const ALL_ITEMS: readonly RibbonMenuItemDef[] = Object.values(ITEM_REGISTRY);

const DEFAULT_TABS: readonly RibbonTabDef[] = [
  {
    id: "home", label: "Home",
    groups: [
      { id: "font", label: "Font", items: [ITEM_REGISTRY["font-family"], ITEM_REGISTRY["font-size"], ITEM_REGISTRY.bold, ITEM_REGISTRY.italic, ITEM_REGISTRY.underline, ITEM_REGISTRY["font-color"]] },
      { id: "paragraph", label: "Paragraph", items: [ITEM_REGISTRY["align-left"], ITEM_REGISTRY["align-center"], ITEM_REGISTRY["align-right"]] },
    ],
  },
  {
    id: "insert", label: "Insert",
    groups: [
      { id: "objects", label: "Objects", items: [
        { id: "textbox", label: "Text Box", icon: <span style={{ fontSize: 12 }}>T</span> },
        { id: "picture", label: "Picture", icon: <span style={{ fontSize: 12 }}>P</span> },
      ]},
    ],
  },
];

// =============================================================================
// Styles
// =============================================================================

const pageStyle: CSSProperties = { display: "flex", flexDirection: "column", height: "100vh", position: "relative" };
const canvasAreaStyle: CSSProperties = { flex: 1, overflow: "hidden" };
const canvasStyle: CSSProperties = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: `var(--bg-canvas, ${colorTokens.background.canvas})`, color: `var(--text-inverse, ${colorTokens.text.inverse})`, fontSize: 13 };
const logStyle: CSSProperties = { fontSize: 11, fontFamily: "monospace", color: `var(--text-secondary, ${colorTokens.text.secondary})` };

// =============================================================================
// Component
// =============================================================================

/** Preview page: data + RibbonMenu + canvas placeholder. */
export function RibbonMenuPreviewPage() {
  const [log, setLog] = useState<string[]>([]);

  const handleExecute = useCallback((id: string) => {
    setLog((prev) => [id, ...prev].slice(0, 5));
  }, []);

  return (
    <div style={pageStyle}>
      <RibbonMenu
        initialTabs={DEFAULT_TABS}
        paletteItems={ALL_ITEMS}
        itemRegistry={ITEM_REGISTRY}
        onExecute={handleExecute}
      >
        <div style={canvasStyle}>
          <div>
            <div>Canvas</div>
            {log.length > 0 && (
              <div style={logStyle} data-testid="action-log">
                {log.map((entry, i) => <div key={i}>{entry}</div>)}
              </div>
            )}
          </div>
        </div>
      </RibbonMenu>
    </div>
  );
}
