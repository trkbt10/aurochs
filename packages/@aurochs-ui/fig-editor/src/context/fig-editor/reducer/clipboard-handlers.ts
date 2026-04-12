/**
 * @file Clipboard action handlers
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createSingleSelection, createEmptySelection } from "@aurochs-ui/editor-core/selection";
import { addNode, removeNode } from "@aurochs-builder/fig/node-ops";
import type { FigNodeId, FigDesignNode } from "@aurochs-builder/fig/types";
import type { FigClipboardContent } from "../types";
import type { HandlerMap } from "./handler-types";
import { findNodesByIds } from "../helpers";

export const CLIPBOARD_HANDLERS: HandlerMap = {
  COPY(state) {
    const page = state.documentHistory.present.pages.find(
      (p) => p.id === state.activePageId,
    );
    if (!page) {
      return state;
    }

    const selectedNodes = findNodesByIds(page, state.nodeSelection.selectedIds);
    if (selectedNodes.length === 0) {
      return state;
    }

    return {
      ...state,
      clipboard: {
        type: "copy",
        nodes: selectedNodes,
        pasteCount: 0,
      },
    };
  },

  PASTE(state) {
    const pageId = state.activePageId;
    if (!pageId || !state.clipboard || state.clipboard.nodes.length === 0) {
      return state;
    }

    const offset = (state.clipboard.pasteCount + 1) * 10;
    let doc = state.documentHistory.present;
    const newIds: FigNodeId[] = [];

    for (const node of state.clipboard.nodes) {
      // Create a spec from the node, offset by paste count
      const result = addNode(doc, pageId, null, {
        type: node.type as "RECTANGLE",
        name: node.name,
        x: node.transform.m02 + offset,
        y: node.transform.m12 + offset,
        width: node.size.x,
        height: node.size.y,
        fills: node.fills,
        strokes: node.strokes,
        effects: node.effects,
        opacity: node.opacity,
      });
      doc = result.doc;
      newIds.push(result.nodeId);
    }

    const primaryId = newIds[0];

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, doc),
      nodeSelection: newIds.length === 1
        ? createSingleSelection(primaryId)
        : {
            selectedIds: newIds,
            primaryId,
          },
      clipboard: {
        ...state.clipboard,
        pasteCount: state.clipboard.pasteCount + 1,
      },
    };
  },
};
