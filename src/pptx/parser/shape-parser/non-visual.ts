/**
 * @file Non-visual properties parsing
 *
 * @see ECMA-376 Part 1, Section 19.3.1.12 (cNvPr)
 */

import { getAttr, getChild, type XmlElement } from "../../../xml";
import type {
  AudioCd,
  AudioCdTime,
  HyperlinkSound,
  MediaReference,
  NonVisualProperties,
  Placeholder,
  PlaceholderSize,
  PlaceholderType,
} from "../../domain";
import { getBoolAttr, getIndexAttr, getIntAttr } from "../primitive";

/**
 * Parse hyperlink from cNvPr
 */
function parseNonVisualHyperlink(
  cNvPr: XmlElement,
  childName: "a:hlinkClick" | "a:hlinkHover",
): NonVisualProperties["hyperlink"] {
  const hlink = getChild(cNvPr, childName);
  if (!hlink) {
    return undefined;
  }

  const id = getAttr(hlink, "r:id");
  if (!id) {
    return undefined;
  }

  const sound = (() => {
    const snd = getChild(hlink, "a:snd");
    if (!snd) {
      return undefined;
    }
    const embed = getAttr(snd, "r:embed");
    if (!embed) {
      return undefined;
    }
    const soundValue: HyperlinkSound = {
      embed,
      name: getAttr(snd, "name"),
    };
    return soundValue;
  })();

  return {
    id,
    tooltip: getAttr(hlink, "tooltip"),
    action: getAttr(hlink, "action"),
    sound,
  };
}

/**
 * Parse non-visual properties (cNvPr)
 * @see ECMA-376 Part 1, Section 19.3.1.12
 */
export function parseNonVisualProperties(cNvPr: XmlElement | undefined): NonVisualProperties {
  if (!cNvPr) {
    return { id: "", name: "" };
  }

  return {
    id: getAttr(cNvPr, "id") ?? "",
    name: getAttr(cNvPr, "name") ?? "",
    description: getAttr(cNvPr, "descr"),
    title: getAttr(cNvPr, "title"),
    hidden: getBoolAttr(cNvPr, "hidden"),
    hyperlink: parseNonVisualHyperlink(cNvPr, "a:hlinkClick"),
    hyperlinkHover: parseNonVisualHyperlink(cNvPr, "a:hlinkHover"),
  };
}

/**
 * Parse media references from nvPr.
 * @see ECMA-376 Part 1, Section 20.1.3
 */
export function parseNonVisualMedia(nvPr: XmlElement | undefined): MediaReference | undefined {
  if (!nvPr) {
    return undefined;
  }

  const audioCd = getChild(nvPr, "a:audioCd");
  const audioFile = parseLinkedMediaFile(getChild(nvPr, "a:audioFile"));
  const quickTimeFile = parseQuickTimeFile(getChild(nvPr, "a:quickTimeFile"));
  const videoFile = parseLinkedMediaFile(getChild(nvPr, "a:videoFile"));
  const wavAudioFile = parseEmbeddedWavAudioFile(getChild(nvPr, "a:wavAudioFile"));

  const audioCdValue = audioCd ? parseAudioCd(audioCd) : undefined;
  const hasMedia = [
    audioCdValue,
    audioFile,
    quickTimeFile,
    videoFile,
    wavAudioFile,
  ].some((value) => value !== undefined);

  if (hasMedia) {
    return {
      audioCd: audioCdValue,
      audioFile,
      quickTimeFile,
      videoFile,
      wavAudioFile,
    };
  }

  return undefined;
}

function parseAudioCd(audioCd: XmlElement): AudioCd {
  const parseAudioCdTime = (el: XmlElement | undefined): AudioCdTime | undefined => {
    if (!el) {
      return undefined;
    }
    const track = getIntAttr(el, "track");
    if (track === undefined) {
      return undefined;
    }
    const time = getIntAttr(el, "time");
    return { track, time: time ?? undefined };
  };

  const start = parseAudioCdTime(getChild(audioCd, "a:st"));
  const end = parseAudioCdTime(getChild(audioCd, "a:end"));
  return { start, end };
}

function parseLinkedMediaFile(element: XmlElement | undefined): { link?: string; contentType?: string } | undefined {
  if (!element) {
    return undefined;
  }
  return {
    link: getAttr(element, "r:link"),
    contentType: getAttr(element, "contentType"),
  };
}

function parseQuickTimeFile(element: XmlElement | undefined): { link?: string } | undefined {
  if (!element) {
    return undefined;
  }
  return {
    link: getAttr(element, "r:link"),
  };
}

function parseEmbeddedWavAudioFile(element: XmlElement | undefined): { embed?: string; name?: string } | undefined {
  if (!element) {
    return undefined;
  }
  return {
    embed: getAttr(element, "r:embed"),
    name: getAttr(element, "name"),
  };
}

/**
 * Parse placeholder properties
 *
 * Placeholder is located at: p:nvSpPr/p:nvPr/p:ph
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36
 */
export function parsePlaceholder(nvSpPr: XmlElement | undefined): Placeholder | undefined {
  if (!nvSpPr) {
    return undefined;
  }

  // Path: p:nvSpPr/p:nvPr/p:ph
  const nvPr = getChild(nvSpPr, "p:nvPr");
  if (!nvPr) {
    return undefined;
  }

  const ph = getChild(nvPr, "p:ph");
  if (!ph) {
    return undefined;
  }

  return {
    type: getAttr(ph, "type") as PlaceholderType | undefined,
    idx: getIndexAttr(ph, "idx"),
    size: getAttr(ph, "sz") as PlaceholderSize | undefined,
    hasCustomPrompt: getBoolAttr(ph, "hasCustomPrompt"),
  };
}
