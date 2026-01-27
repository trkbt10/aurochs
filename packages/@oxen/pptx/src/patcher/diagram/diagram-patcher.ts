/**
 * @file Diagram (SmartArt) patcher (Phase 10)
 *
 * Updates DiagramML data model parts (data.xml) for basic node text edits.
 *
 * SmartArt diagrams are composed of multiple XML parts:
 * - data.xml: data model (dgm:dataModel)
 * - layout.xml: layout definition
 * - colors.xml: color definition
 * - quickStyle.xml: style definition
 */

import { createElement, createText, getByPath, getChild, getChildren, isXmlElement, type XmlDocument, type XmlElement, type XmlNode } from "@oxen/xml";
import { setChildren, updateDocumentRoot } from "../core/xml-mutator";

export type DiagramFiles = {
  readonly data: XmlDocument;
  readonly layout: XmlDocument;
  readonly colors: XmlDocument;
  readonly quickStyle: XmlDocument;
};

export type DiagramChange =
  | { readonly type: "nodeText"; readonly nodeId: string; readonly text: string }
  | { readonly type: "addNode"; readonly parentId: string; readonly nodeId: string; readonly text: string }
  | { readonly type: "removeNode"; readonly nodeId: string }
  | { readonly type: "setConnection"; readonly srcId: string; readonly destId: string; readonly connectionType: string };

function requireDataModelRoot(dataXml: XmlDocument): XmlElement {
  const root = getByPath(dataXml, ["dgm:dataModel"]);
  if (!root) {
    throw new Error("DiagramPatcher: missing dgm:dataModel root");
  }
  return root;
}

function createDiagramText(text: string): XmlElement {
  return createElement("dgm:t", {}, [
    createElement("a:bodyPr"),
    createElement("a:lstStyle"),
    createElement("a:p", {}, [createElement("a:r", {}, [createElement("a:t", {}, [createText(text)])])]),
  ]);
}

function hasPoint(ptLst: XmlElement, nodeId: string): boolean {
  return getChildren(ptLst, "dgm:pt").some((pt) => pt.attrs.modelId === nodeId);
}

function patchPointText(pt: XmlElement, text: string): XmlElement {
  const t = getChild(pt, "dgm:t");
  const nextT = createDiagramText(text);
  if (t) {
    return setChildren(
      pt,
      pt.children.map((c) => (isXmlElement(c) && c.name === "dgm:t" ? nextT : c)),
    );
  }
  return setChildren(pt, [...pt.children, nextT]);
}

function addConnection(
  cxnLst: XmlElement,
  srcId: string,
  destId: string,
  connectionType: string,
): XmlElement {
  const existing = getChildren(cxnLst, "dgm:cxn").some(
    (cxn) => cxn.attrs.srcId === srcId && cxn.attrs.destId === destId && cxn.attrs.type === connectionType,
  );
  if (existing) {
    return cxnLst;
  }
  const cxn = createElement("dgm:cxn", { srcId, destId, type: connectionType });
  return setChildren(cxnLst, [...cxnLst.children, cxn]);
}

function removeConnectionsForNode(cxnLst: XmlElement, nodeId: string): XmlElement {
  const next = cxnLst.children.filter((c) => {
    if (!isXmlElement(c) || c.name !== "dgm:cxn") {
      return true;
    }
    return c.attrs.srcId !== nodeId && c.attrs.destId !== nodeId;
  });
  return setChildren(cxnLst, next);
}

export function patchDiagramNodeText(dataXml: XmlDocument, nodeId: string, text: string): XmlDocument {
  if (!nodeId) {
    throw new Error("patchDiagramNodeText: nodeId is required");
  }
  if (text === undefined) {
    throw new Error("patchDiagramNodeText: text is required");
  }

  return updateDocumentRoot(dataXml, (root) => {
    const dataModel = root.name === "dgm:dataModel" ? root : requireDataModelRoot(dataXml);
    const ptLst = getChild(dataModel, "dgm:ptLst");
    if (!ptLst) {
      throw new Error("patchDiagramNodeText: missing dgm:ptLst");
    }

    const pts = getChildren(ptLst, "dgm:pt");
    const idx = pts.findIndex((pt) => pt.attrs.modelId === nodeId);
    if (idx < 0) {
      throw new Error(`patchDiagramNodeText: node not found: ${nodeId}`);
    }

    let ptIndex = -1;
    const nextPtLstChildren = ptLst.children.map((c) => {
      if (!isXmlElement(c) || c.name !== "dgm:pt") {
        return c;
      }
      ptIndex += 1;
      return ptIndex === idx ? patchPointText(c, text) : c;
    });

    const nextPtLst = setChildren(ptLst, nextPtLstChildren);
    return setChildren(
      dataModel,
      dataModel.children.map((c) => (isXmlElement(c) && c.name === "dgm:ptLst" ? nextPtLst : c)),
    );
  });
}

function addDiagramNode(dataXml: XmlDocument, parentId: string, nodeId: string, text: string): XmlDocument {
  if (!parentId) {
    throw new Error("addNode: parentId is required");
  }
  if (!nodeId) {
    throw new Error("addNode: nodeId is required");
  }

  return updateDocumentRoot(dataXml, (root) => {
    const dataModel = root.name === "dgm:dataModel" ? root : requireDataModelRoot(dataXml);
    const ptLst = getChild(dataModel, "dgm:ptLst");
    if (!ptLst) {
      throw new Error("addNode: missing dgm:ptLst");
    }
    const cxnLst = getChild(dataModel, "dgm:cxnLst") ?? createElement("dgm:cxnLst");

    if (hasPoint(ptLst, nodeId)) {
      throw new Error(`addNode: nodeId already exists: ${nodeId}`);
    }

    if (!hasPoint(ptLst, parentId)) {
      throw new Error(`addNode: parentId not found: ${parentId}`);
    }

    const pt = createElement("dgm:pt", { modelId: nodeId, type: "node" }, [createDiagramText(text)]);
    const nextPtLst = setChildren(ptLst, [...ptLst.children, pt]);
    const nextCxnLst = addConnection(cxnLst, parentId, nodeId, "parOf");

    const nextChildren: XmlNode[] = dataModel.children.map((c) => {
      if (!isXmlElement(c)) {
        return c;
      }
      if (c.name === "dgm:ptLst") {
        return nextPtLst;
      }
      if (c.name === "dgm:cxnLst") {
        return nextCxnLst;
      }
      return c;
    });

    if (!getChild(dataModel, "dgm:cxnLst")) {
      nextChildren.push(nextCxnLst);
    }

    return setChildren(dataModel, nextChildren);
  });
}

function removeDiagramNode(dataXml: XmlDocument, nodeId: string): XmlDocument {
  if (!nodeId) {
    throw new Error("removeNode: nodeId is required");
  }

  return updateDocumentRoot(dataXml, (root) => {
    const dataModel = root.name === "dgm:dataModel" ? root : requireDataModelRoot(dataXml);
    const ptLst = getChild(dataModel, "dgm:ptLst");
    if (!ptLst) {
      throw new Error("removeNode: missing dgm:ptLst");
    }

    const pts = getChildren(ptLst, "dgm:pt");
    const exists = pts.some((pt) => pt.attrs.modelId === nodeId);
    if (!exists) {
      throw new Error(`removeNode: node not found: ${nodeId}`);
    }

    const nextPtLst = setChildren(
      ptLst,
      ptLst.children.filter((c) => !(isXmlElement(c) && c.name === "dgm:pt" && c.attrs.modelId === nodeId)),
    );

    const cxnLst = getChild(dataModel, "dgm:cxnLst");
    const nextCxnLst = cxnLst ? removeConnectionsForNode(cxnLst, nodeId) : undefined;

    return setChildren(
      dataModel,
      dataModel.children.map((c) => {
        if (!isXmlElement(c)) {
          return c;
        }
        if (c.name === "dgm:ptLst") {
          return nextPtLst;
        }
        if (c.name === "dgm:cxnLst" && nextCxnLst) {
          return nextCxnLst;
        }
        return c;
      }),
    );
  });
}

function setDiagramConnection(
  dataXml: XmlDocument,
  srcId: string,
  destId: string,
  connectionType: string,
): XmlDocument {
  if (!srcId || !destId) {
    throw new Error("setConnection: srcId and destId are required");
  }
  if (!connectionType) {
    throw new Error("setConnection: connectionType is required");
  }

  return updateDocumentRoot(dataXml, (root) => {
    const dataModel = root.name === "dgm:dataModel" ? root : requireDataModelRoot(dataXml);
    const ptLst = getChild(dataModel, "dgm:ptLst");
    if (!ptLst) {
      throw new Error("setConnection: missing dgm:ptLst");
    }
    if (!hasPoint(ptLst, srcId) || !hasPoint(ptLst, destId)) {
      throw new Error("setConnection: srcId/destId must exist in dgm:ptLst");
    }

    const cxnLst = getChild(dataModel, "dgm:cxnLst") ?? createElement("dgm:cxnLst");
    const nextCxnLst = addConnection(cxnLst, srcId, destId, connectionType);

    const hasCxnLst = getChild(dataModel, "dgm:cxnLst") !== undefined;
    if (hasCxnLst) {
      const nextChildren = dataModel.children.map((c) =>
        isXmlElement(c) && c.name === "dgm:cxnLst" ? nextCxnLst : c,
      );
      return setChildren(dataModel, nextChildren);
    }
    const nextChildren = [...dataModel.children, nextCxnLst];

    return setChildren(dataModel, nextChildren);
  });
}

export function patchDiagram(diagramFiles: DiagramFiles, changes: readonly DiagramChange[]): DiagramFiles {
  let nextData = diagramFiles.data;

  for (const change of changes) {
    switch (change.type) {
      case "nodeText":
        nextData = patchDiagramNodeText(nextData, change.nodeId, change.text);
        break;
      case "addNode":
        nextData = addDiagramNode(nextData, change.parentId, change.nodeId, change.text);
        break;
      case "removeNode":
        nextData = removeDiagramNode(nextData, change.nodeId);
        break;
      case "setConnection":
        nextData = setDiagramConnection(nextData, change.srcId, change.destId, change.connectionType);
        break;
      default:
        ((_: never) => _)(change);
    }
  }

  return {
    ...diagramFiles,
    data: nextData,
  };
}
