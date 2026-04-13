/**
 * @file Clipboard action handlers
 */

import { pushHistory } from "@aurochs-ui/editor-core/history";
import { createSingleSelection } from "@aurochs-ui/editor-core/selection";
import { addNode } from "@aurochs-builder/fig/node-ops";
import type { FigNodeId } from "@aurochs/fig/domain";
import type { HandlerMap } from "./handler-types";
import { findNodesByIds } from "../node-geometry";

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
    const { doc, newIds } = state.clipboard.nodes.reduce(
      (acc, node) => {
        const result = addNode({
          doc: acc.doc,
          pageId,
          parentId: null,
          spec: {
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
          },
        });
        return { doc: result.doc, newIds: [...acc.newIds, result.nodeId] };
      },
      { doc: state.documentHistory.present, newIds: [] as FigNodeId[] },
    );

    const primaryId = newIds[0];

    return {
      ...state,
      documentHistory: pushHistory(state.documentHistory, doc),
      nodeSelection: newIds.length === 1 ? createSingleSelection(primaryId) : { selectedIds: newIds, primaryId },
      clipboard: {
        ...state.clipboard,
        pasteCount: state.clipboard.pasteCount + 1,
      },
    };
  },
};
