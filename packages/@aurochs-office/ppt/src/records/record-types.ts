/**
 * @file PPT record type constants
 *
 * @see [MS-PPT] Section 2.13 (RecordType enumeration)
 * @see [MS-ODRAW] Section 2.1 (OfficeArt Record types)
 */

export const RT = {
  // =========================================================================
  // Document-level containers/atoms
  // =========================================================================
  DocumentContainer:          0x03E8,
  DocumentAtom:               0x03E9,
  EndDocumentAtom:            0x03EA,
  SlideListWithText:          0x0FF0,
  SlidePersistAtom:           0x03F3,
  Environment:                0x03F2,

  // =========================================================================
  // Slide-level
  // =========================================================================
  SlideContainer:             0x03EE,
  SlideAtom:                  0x03EF,
  NotesContainer:             0x03F0,
  NotesAtom:                  0x03F1,
  MainMasterContainer:        0x03F8,
  MainMasterAtom:             0x03F9,

  // =========================================================================
  // Text records
  // =========================================================================
  TextHeaderAtom:             0x0F9F,
  TextCharsAtom:              0x0FA0,
  StyleTextPropAtom:          0x0FA1,
  TextRulerAtom:              0x0FA2,
  MasterTextPropAtom:         0x0FA3,
  TextBookmarkAtom:           0x0FA7,
  TextBytesAtom:              0x0FA8,
  TextSpecialInfoAtom:        0x0FAA,
  InteractiveInfoAtom:        0x0FF2,
  InteractiveInfoInstance:    0x0FF3,
  TxInteractiveInfoAtom:      0x0FDF,
  FontEntityAtom:             0x0FB7,
  FontCollection:             0x07D5,

  // =========================================================================
  // OfficeArt (shapes) - [MS-ODRAW]
  // =========================================================================
  OfficeArtDggContainer:      0xF000,
  OfficeArtBStoreContainer:   0xF001,
  OfficeArtDgContainer:       0xF002,
  OfficeArtSpgrContainer:     0xF003,
  OfficeArtSpContainer:       0xF004,
  OfficeArtFDGG:              0xF006,
  OfficeArtBStoreEntry:       0xF007,
  OfficeArtFDG:               0xF008,
  OfficeArtFSPGR:             0xF009,
  OfficeArtFSP:               0xF00A,
  OfficeArtFOPT:              0xF00B,
  OfficeArtClientTextbox:     0xF00D,
  OfficeArtChildAnchor:       0xF00F,
  OfficeArtClientAnchor:      0xF010,
  OfficeArtClientData:        0xF011,
  OfficeArtSecondaryFOPT:     0xF121,
  OfficeArtTertiaryFOPT:      0xF122,

  // =========================================================================
  // BLIP (pictures) - [MS-ODRAW]
  // =========================================================================
  OfficeArtBlipEMF:           0xF01A,
  OfficeArtBlipWMF:           0xF01B,
  OfficeArtBlipPICT:          0xF01C,
  OfficeArtBlipJPEG1:         0xF01D,
  OfficeArtBlipPNG:           0xF01E,
  OfficeArtBlipDIB:           0xF01F,
  OfficeArtBlipTIFF:          0xF029,
  OfficeArtBlipJPEG2:         0xF02A,

  // =========================================================================
  // Persist / User Edit
  // =========================================================================
  CurrentUserAtom:            0x0FF6,
  UserEditAtom:               0x0FF5,
  PersistDirectoryAtom:       0x1772,

  // =========================================================================
  // Color / Theme
  // =========================================================================
  ColorSchemeAtom:            0x07F0,

  // =========================================================================
  // Hyperlinks
  // =========================================================================
  ExternalHyperlinkContainer: 0x0FD7,
  ExternalHyperlinkAtom:      0x0FD3,
  ExternalOleLink:            0x0FD1,
  ExObjListContainer:         0x0409,
  ExObjListAtom:              0x040A,
  CString:                    0x0FBA,

  // =========================================================================
  // Table (PP10 extension)
  // =========================================================================
  PP10ShapeGroup:             0x13E9,

  // =========================================================================
  // Drawing wrapper
  // =========================================================================
  PPDrawing:                    0x040C,

  // =========================================================================
  // Headers/Footers
  // =========================================================================
  HeadersFootersContainer:    0x0FD9,
  HeadersFootersAtom:         0x0FDA,

  // =========================================================================
  // Notes
  // =========================================================================
  NotesTextViewInfoAtom:      0x0F9A,

  // =========================================================================
  // OLE
  // =========================================================================
  ExOleEmbedContainer:        0x0FCC,
  ExOleEmbedAtom:             0x0FCD,
  ExOleObjAtom:               0x0FC3,

  // =========================================================================
  // Chart
  // =========================================================================
  ExternalOleObjectAtom:      0x0FC1,
} as const;
