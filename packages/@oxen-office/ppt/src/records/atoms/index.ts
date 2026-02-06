/**
 * @file Atoms module barrel export
 */

export { parseDocumentAtom, type DocumentAtomData } from "./document";
export { parseSlideAtom, parseSlidePersistAtom, type SlideAtomData, type SlidePersistAtomData } from "./slide";
export {
  parseTextHeaderAtom, decodeTextCharsAtom, decodeTextBytesAtom,
  parseStyleTextPropAtom, parseFontEntityAtom,
  TEXT_TYPE,
  type TextHeaderAtomData, type ParagraphStyleRun, type CharacterStyleRun, type StyleTextPropData,
  type FontEntityAtomData,
} from "./text";
export {
  parseOfficeArtFSP, parseOfficeArtFOPT, getShapeProp,
  parseClientAnchor, parseChildAnchor, msosptToPresetShape,
  SHAPE_PROP,
  type ShapeFlags, type ShapeProperty, type ClientAnchorData, type ChildAnchorData,
} from "./shape";
export {
  parseColorSchemeAtom, resolveColor, resolveSchemeColor,
  DEFAULT_COLOR_SCHEME,
  type ColorScheme,
} from "./color";
export { parseBlipRecord, isBlipRecordType, type BlipData } from "./picture";
