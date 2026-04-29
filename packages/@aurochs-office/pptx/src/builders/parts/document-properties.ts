/**
 * @file Document properties (docProps/*) builders
 *
 * Builders for the OPC document-property parts:
 *   - docProps/app.xml  (Office extended properties, ECMA-376 Part 4 §22.2)
 *   - docProps/core.xml (OPC core properties, ECMA-376 Part 2 §11.3)
 *
 * Custom properties (docProps/custom.xml) are out of scope for the
 * blank-deck path and are not yet provided here.
 */

import { OFFICE_NAMESPACES } from "@aurochs-office/opc";
import { createElement, createText, type XmlDocument, type XmlElement } from "@aurochs/xml";

/** Namespace URI for OPC core properties (`cp:`). */
const CORE_PROPERTIES_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
/** Namespace URI for Dublin Core (`dc:`) used by core properties. */
const DC_NAMESPACE = "http://purl.org/dc/elements/1.1/";
/** Namespace URI for Dublin Core Terms (`dcterms:`). */
const DCTERMS_NAMESPACE = "http://purl.org/dc/terms/";
/** Namespace URI for the dcterms type marker (`xsi:`). */
const XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance";

export type BuildAppPropertiesOptions = {
  /** AppVersion string (defaults to "16.0000" — Office 2016+). */
  readonly appVersion?: string;
  /** Application name (defaults to "Microsoft Office PowerPoint"). */
  readonly application?: string;
  /** Total slide count (writes &lt;Slides&gt;). Optional. */
  readonly slideCount?: number;
  /** Total notes-slide count (writes &lt;Notes&gt;). Optional. */
  readonly notesCount?: number;
  /** Hidden-slide count (writes &lt;HiddenSlides&gt;). Optional. */
  readonly hiddenSlideCount?: number;
};

/**
 * Build the Office extended-properties part (docProps/app.xml).
 *
 * @see ECMA-376 Part 4, §22.2 (Extended Properties Part)
 */
export function buildAppProperties(options: BuildAppPropertiesOptions = {}): XmlDocument {
  const children: XmlElement[] = [];
  if (options.application !== undefined) {
    children.push(createElement("Application", {}, [createText(options.application)]));
  }
  if (options.slideCount !== undefined) {
    children.push(createElement("Slides", {}, [createText(String(options.slideCount))]));
  }
  if (options.notesCount !== undefined) {
    children.push(createElement("Notes", {}, [createText(String(options.notesCount))]));
  }
  if (options.hiddenSlideCount !== undefined) {
    children.push(createElement("HiddenSlides", {}, [createText(String(options.hiddenSlideCount))]));
  }
  children.push(createElement("AppVersion", {}, [createText(options.appVersion ?? "16.0000")]));

  return {
    children: [
      createElement("Properties", { xmlns: OFFICE_NAMESPACES.extendedProperties }, children),
    ],
  };
}

export type BuildCoreXmlOptions = {
  /** dc:title — document title */
  readonly title?: string;
  /** dc:subject */
  readonly subject?: string;
  /** dc:creator — author */
  readonly creator?: string;
  /** cp:keywords */
  readonly keywords?: string;
  /** dc:description */
  readonly description?: string;
  /** cp:lastModifiedBy — last modifier */
  readonly lastModifiedBy?: string;
  /** cp:revision — revision number string */
  readonly revision?: string;
  /** dcterms:created — ISO-8601 timestamp; defaults to "now". */
  readonly created?: string;
  /** dcterms:modified — ISO-8601 timestamp; defaults to "now". */
  readonly modified?: string;
};

/**
 * Build the OPC core-properties part (docProps/core.xml).
 *
 * @see ECMA-376 Part 2, §11.3 (Core Properties Part)
 */
export function buildCoreProperties(options: BuildCoreXmlOptions = {}): XmlDocument {
  const now = new Date().toISOString();
  const children: XmlElement[] = [];

  if (options.title !== undefined) {
    children.push(createElement("dc:title", {}, [createText(options.title)]));
  }
  if (options.subject !== undefined) {
    children.push(createElement("dc:subject", {}, [createText(options.subject)]));
  }
  if (options.creator !== undefined) {
    children.push(createElement("dc:creator", {}, [createText(options.creator)]));
  }
  if (options.keywords !== undefined) {
    children.push(createElement("cp:keywords", {}, [createText(options.keywords)]));
  }
  if (options.description !== undefined) {
    children.push(createElement("dc:description", {}, [createText(options.description)]));
  }
  if (options.lastModifiedBy !== undefined) {
    children.push(createElement("cp:lastModifiedBy", {}, [createText(options.lastModifiedBy)]));
  }
  if (options.revision !== undefined) {
    children.push(createElement("cp:revision", {}, [createText(options.revision)]));
  }
  children.push(createElement(
    "dcterms:created",
    { "xsi:type": "dcterms:W3CDTF" },
    [createText(options.created ?? now)],
  ));
  children.push(createElement(
    "dcterms:modified",
    { "xsi:type": "dcterms:W3CDTF" },
    [createText(options.modified ?? now)],
  ));

  return {
    children: [
      createElement(
        "cp:coreProperties",
        {
          "xmlns:cp": CORE_PROPERTIES_NAMESPACE,
          "xmlns:dc": DC_NAMESPACE,
          "xmlns:dcterms": DCTERMS_NAMESPACE,
          "xmlns:xsi": XSI_NAMESPACE,
        },
        children,
      ),
    ],
  };
}
