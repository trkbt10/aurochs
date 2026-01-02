/**
 * @file Tests for ECMA-376 compliant presentation parsing
 *
 * Tests parsing of p:presentation element per ECMA-376 Part 1, Section 19.2.1.26.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.26 (p:presentation)
 */

import {
  parsePresentation,
  parseSldSz,
  parseNotesSz,
  parseSldIdLst,
  parseSldMasterIdLst,
  parseNotesMasterIdLst,
  parseHandoutMasterIdLst,
  parseEmbeddedFont,
  parseEmbeddedFontLst,
  parseCustShow,
  parseCustShowLst,
  parseModifyVerifier,
  parsePhotoAlbum,
  parseSmartTags,
} from "./presentation-parser";
import type { XmlElement } from "../../../xml/index";
import {
  DEFAULT_SERVER_ZOOM,
  DEFAULT_FIRST_SLIDE_NUM,
  DEFAULT_SHOW_SPECIAL_PLS_ON_TITLE_SLD,
  DEFAULT_RTL,
  DEFAULT_REMOVE_PERSONAL_INFO_ON_SAVE,
  DEFAULT_COMPAT_MODE,
  DEFAULT_STRICT_FIRST_AND_LAST_CHARS,
  DEFAULT_EMBED_TRUETYPE_FONTS,
  DEFAULT_SAVE_SUBSET_FONTS,
  DEFAULT_AUTO_COMPRESS_PICTURES,
  DEFAULT_BOOKMARK_ID_SEED,
} from "../../core/ecma376/defaults";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock XmlElement for testing
 */
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// p:presentation - Section 19.2.1.26
// =============================================================================

describe("parsePresentation - ECMA-376 Section 19.2.1.26 compliance", () => {
  describe("Attribute defaults", () => {
    it("uses default serverZoom (50000) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.serverZoom).toBe(DEFAULT_SERVER_ZOOM);
    });

    it("uses default firstSlideNum (1) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.firstSlideNum).toBe(DEFAULT_FIRST_SLIDE_NUM);
    });

    it("uses default showSpecialPlsOnTitleSld (true) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.showSpecialPlsOnTitleSld).toBe(DEFAULT_SHOW_SPECIAL_PLS_ON_TITLE_SLD);
    });

    it("uses default rtl (false) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.rtl).toBe(DEFAULT_RTL);
    });

    it("uses default removePersonalInfoOnSave (false) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.removePersonalInfoOnSave).toBe(DEFAULT_REMOVE_PERSONAL_INFO_ON_SAVE);
    });

    it("uses default compatMode (false) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.compatMode).toBe(DEFAULT_COMPAT_MODE);
    });

    it("uses default strictFirstAndLastChars (true) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.strictFirstAndLastChars).toBe(DEFAULT_STRICT_FIRST_AND_LAST_CHARS);
    });

    it("uses default embedTrueTypeFonts (false) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.embedTrueTypeFonts).toBe(DEFAULT_EMBED_TRUETYPE_FONTS);
    });

    it("uses default saveSubsetFonts (false) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.saveSubsetFonts).toBe(DEFAULT_SAVE_SUBSET_FONTS);
    });

    it("uses default autoCompressPictures (true) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.autoCompressPictures).toBe(DEFAULT_AUTO_COMPRESS_PICTURES);
    });

    it("uses default bookmarkIdSeed (1) when attribute is not specified", () => {
      const pres = el("p:presentation", {}, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.bookmarkIdSeed).toBe(DEFAULT_BOOKMARK_ID_SEED);
    });
  });

  describe("Attribute parsing", () => {
    it("parses serverZoom attribute correctly", () => {
      const pres = el("p:presentation", { serverZoom: "75000" }, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.serverZoom).toBe(75000);
    });

    it("parses firstSlideNum attribute correctly", () => {
      const pres = el("p:presentation", { firstSlideNum: "5" }, [el("p:notesSz", { cx: "6858000", cy: "9144000" })]);
      const result = parsePresentation(pres);
      expect(result.firstSlideNum).toBe(5);
    });

    it("parses boolean attributes as true when value is '1'", () => {
      const pres = el("p:presentation", { rtl: "1", embedTrueTypeFonts: "1" }, [
        el("p:notesSz", { cx: "6858000", cy: "9144000" }),
      ]);
      const result = parsePresentation(pres);
      expect(result.rtl).toBe(true);
      expect(result.embedTrueTypeFonts).toBe(true);
    });

    it("parses boolean attributes as true when value is 'true'", () => {
      const pres = el("p:presentation", { rtl: "true", embedTrueTypeFonts: "true" }, [
        el("p:notesSz", { cx: "6858000", cy: "9144000" }),
      ]);
      const result = parsePresentation(pres);
      expect(result.rtl).toBe(true);
      expect(result.embedTrueTypeFonts).toBe(true);
    });

    it("parses boolean attributes as false when value is '0'", () => {
      const pres = el("p:presentation", { showSpecialPlsOnTitleSld: "0", strictFirstAndLastChars: "0" }, [
        el("p:notesSz", { cx: "6858000", cy: "9144000" }),
      ]);
      const result = parsePresentation(pres);
      expect(result.showSpecialPlsOnTitleSld).toBe(false);
      expect(result.strictFirstAndLastChars).toBe(false);
    });

    it("parses boolean attributes as false when value is 'false'", () => {
      const pres = el("p:presentation", { showSpecialPlsOnTitleSld: "false", strictFirstAndLastChars: "false" }, [
        el("p:notesSz", { cx: "6858000", cy: "9144000" }),
      ]);
      const result = parsePresentation(pres);
      expect(result.showSpecialPlsOnTitleSld).toBe(false);
      expect(result.strictFirstAndLastChars).toBe(false);
    });

    it("parses embedded font list when present", () => {
      const pres = el("p:presentation", {}, [
        el("p:notesSz", { cx: "6858000", cy: "9144000" }),
        el("p:embeddedFontLst", {}, [
          el("p:embeddedFont", {}, [
            el("p:font", {
              typeface: "Calibri",
              panose: "020F0502020204030204",
              pitchFamily: "34",
              charset: "0",
            }),
            el("p:regular", { "r:id": "rId1" }),
            el("p:boldItalic", { "r:id": "rId2" }),
          ]),
        ]),
      ]);
      const result = parsePresentation(pres);
      expect(result.embeddedFonts).toHaveLength(1);
      expect(result.embeddedFonts?.[0].boldItalic?.rId).toBe("rId2");
    });

    it("parses custom show list when present", () => {
      const pres = el("p:presentation", {}, [
        el("p:notesSz", { cx: "6858000", cy: "9144000" }),
        el("p:custShowLst", {}, [
          el("p:custShow", { id: "0", name: "Demo Show" }, [
            el("p:sldLst", {}, [el("p:sld", { "r:id": "rId7" })]),
          ]),
        ]),
      ]);
      const result = parsePresentation(pres);
      expect(result.customShows).toHaveLength(1);
      expect(result.customShows?.[0].name).toBe("Demo Show");
    });

    it("parses modify verifier and photo album when present", () => {
      const pres = el("p:presentation", {}, [
        el("p:notesSz", { cx: "6858000", cy: "9144000" }),
        el("p:modifyVerifier", {
          algorithmName: "SHA-512",
          hashValue: "hashValue",
          saltValue: "saltValue",
          spinCount: "100000",
        }),
        el("p:photoAlbum", { bw: "1", layout: "2pic", frame: "frameStyle1", showCaptions: "0" }),
        el("p:smartTags", { "r:id": "rId9" }),
      ]);
      const result = parsePresentation(pres);
      expect(result.modifyVerifier?.algorithmName).toBe("SHA-512");
      expect(result.photoAlbum?.layout).toBe("2pic");
      expect(result.smartTags?.rId).toBe("rId9");
    });
  });
});

// =============================================================================
// p:custShow - Section 19.2.1.5
// =============================================================================

describe("parseCustShow - ECMA-376 Section 19.2.1.5 compliance", () => {
  it("parses custom show attributes and slide list", () => {
    const custShow = el("p:custShow", { id: "1", name: "Team Deck" }, [
      el("p:sldLst", {}, [el("p:sld", { "r:id": "rId2" }), el("p:sld", { "r:id": "rId5" })]),
    ]);
    const result = parseCustShow(custShow);
    expect(result.id).toBe(1);
    expect(result.name).toBe("Team Deck");
    expect(result.slideIds).toEqual(["rId2", "rId5"]);
  });
});

// =============================================================================
// p:custShowLst - Section 19.2.1.7
// =============================================================================

describe("parseCustShowLst - ECMA-376 Section 19.2.1.7 compliance", () => {
  it("parses custom show list entries", () => {
    const custShowLst = el("p:custShowLst", {}, [
      el("p:custShow", { id: "0", name: "Show A" }),
      el("p:custShow", { id: "1", name: "Show B" }),
    ]);
    const result = parseCustShowLst(custShowLst);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Show A");
  });
});

// =============================================================================
// p:modifyVerifier - Section 19.2.1.19
// =============================================================================

describe("parseModifyVerifier - ECMA-376 Section 19.2.1.19 compliance", () => {
  it("parses modify verifier attributes", () => {
    const modifyVerifier = el("p:modifyVerifier", {
      algorithmName: "SHA-1",
      hashValue: "hashValue",
      saltValue: "saltValue",
      spinCount: "100000",
    });
    const result = parseModifyVerifier(modifyVerifier);
    expect(result.algorithmName).toBe("SHA-1");
    expect(result.hashValue).toBe("hashValue");
    expect(result.saltValue).toBe("saltValue");
    expect(result.spinCount).toBe(100000);
  });
});

// =============================================================================
// p:photoAlbum - Section 19.2.1.24
// =============================================================================

describe("parsePhotoAlbum - ECMA-376 Section 19.2.1.24 compliance", () => {
  it("parses photo album attributes", () => {
    const photoAlbum = el("p:photoAlbum", { bw: "1", frame: "frameStyle1", layout: "2pic", showCaptions: "0" });
    const result = parsePhotoAlbum(photoAlbum);
    expect(result.blackAndWhite).toBe(true);
    expect(result.frame).toBe("frameStyle1");
    expect(result.layout).toBe("2pic");
    expect(result.showCaptions).toBe(false);
  });
});

// =============================================================================
// p:smartTags - Section 19.2.1.40
// =============================================================================

describe("parseSmartTags - ECMA-376 Section 19.2.1.40 compliance", () => {
  it("parses smart tags relationship ID", () => {
    const smartTags = el("p:smartTags", { "r:id": "rId9" });
    const result = parseSmartTags(smartTags);
    expect(result.rId).toBe("rId9");
  });
});

// =============================================================================
// p:embeddedFont - Section 19.2.1.9
// =============================================================================

describe("parseEmbeddedFont - ECMA-376 Section 19.2.1.9 compliance", () => {
  it("parses embedded font attributes and references", () => {
    const embeddedFont = el("p:embeddedFont", {}, [
      el("p:font", {
        typeface: "Calibri",
        panose: "020F0502020204030204",
        pitchFamily: "34",
        charset: "0",
      }),
      el("p:regular", { "r:id": "rId1" }),
      el("p:bold", { "r:id": "rId2" }),
      el("p:italic", { "r:id": "rId3" }),
      el("p:boldItalic", { "r:id": "rId4" }),
    ]);
    const result = parseEmbeddedFont(embeddedFont);
    expect(result.font?.typeface).toBe("Calibri");
    expect(result.font?.panose).toBe("020F0502020204030204");
    expect(result.font?.pitchFamily).toBe("34");
    expect(result.font?.charset).toBe("0");
    expect(result.regular?.rId).toBe("rId1");
    expect(result.bold?.rId).toBe("rId2");
    expect(result.italic?.rId).toBe("rId3");
    expect(result.boldItalic?.rId).toBe("rId4");
  });
});

// =============================================================================
// p:embeddedFontLst - Section 19.2.1.10
// =============================================================================

describe("parseEmbeddedFontLst - ECMA-376 Section 19.2.1.10 compliance", () => {
  it("parses embedded font list entries", () => {
    const embeddedFontLst = el("p:embeddedFontLst", {}, [
      el("p:embeddedFont", {}, [el("p:regular", { "r:id": "rId1" })]),
      el("p:embeddedFont", {}, [el("p:boldItalic", { "r:id": "rId2" })]),
    ]);
    const result = parseEmbeddedFontLst(embeddedFontLst);
    expect(result).toHaveLength(2);
    expect(result[0].regular?.rId).toBe("rId1");
    expect(result[1].boldItalic?.rId).toBe("rId2");
  });
});

// =============================================================================
// p:sldSz - Section 19.2.1.36
// =============================================================================

describe("parseSldSz - ECMA-376 Section 19.2.1.36 compliance", () => {
  it("parses cx and cy attributes in EMU", () => {
    const sldSz = el("p:sldSz", { cx: "9144000", cy: "6858000" });
    const result = parseSldSz(sldSz);
    expect(result.widthEmu).toBe(9144000);
    expect(result.heightEmu).toBe(6858000);
  });

  it("parses type attribute when present", () => {
    const sldSz = el("p:sldSz", { cx: "9144000", cy: "6858000", type: "screen16x9" });
    const result = parseSldSz(sldSz);
    expect(result.type).toBe("screen16x9");
  });

  it("returns undefined type when not specified", () => {
    const sldSz = el("p:sldSz", { cx: "9144000", cy: "6858000" });
    const result = parseSldSz(sldSz);
    expect(result.type).toBeUndefined();
  });

  it("handles various slide size types", () => {
    const types = [
      "screen4x3",
      "letter",
      "A4",
      "35mm",
      "overhead",
      "banner",
      "custom",
      "ledger",
      "A3",
      "B4ISO",
      "B5ISO",
      "B4JIS",
      "B5JIS",
      "hagakiCard",
      "screen16x9",
      "screen16x10",
    ];

    for (const type of types) {
      const sldSz = el("p:sldSz", { cx: "9144000", cy: "6858000", type });
      const result = parseSldSz(sldSz);
      expect(result.type).toBe(type);
    }
  });
});

// =============================================================================
// p:notesSz - Section 19.2.1.23
// =============================================================================

describe("parseNotesSz - ECMA-376 Section 19.2.1.23 compliance", () => {
  it("parses cx and cy attributes in EMU", () => {
    const notesSz = el("p:notesSz", { cx: "6858000", cy: "9144000" });
    const result = parseNotesSz(notesSz);
    expect(result.widthEmu).toBe(6858000);
    expect(result.heightEmu).toBe(9144000);
  });

  it("returns 0 for missing cx/cy attributes", () => {
    const notesSz = el("p:notesSz", {});
    const result = parseNotesSz(notesSz);
    expect(result.widthEmu).toBe(0);
    expect(result.heightEmu).toBe(0);
  });
});

// =============================================================================
// p:sldIdLst - Section 19.2.1.34
// =============================================================================

describe("parseSldIdLst - ECMA-376 Section 19.2.1.34 compliance", () => {
  it("parses empty slide ID list", () => {
    const sldIdLst = el("p:sldIdLst", {}, []);
    const result = parseSldIdLst(sldIdLst);
    expect(result).toEqual([]);
  });

  it("parses single slide ID", () => {
    const sldIdLst = el("p:sldIdLst", {}, [el("p:sldId", { id: "256", "r:id": "rId2" })]);
    const result = parseSldIdLst(sldIdLst);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(256);
    expect(result[0].rId).toBe("rId2");
  });

  it("parses multiple slide IDs in order", () => {
    const sldIdLst = el("p:sldIdLst", {}, [
      el("p:sldId", { id: "256", "r:id": "rId2" }),
      el("p:sldId", { id: "257", "r:id": "rId3" }),
      el("p:sldId", { id: "258", "r:id": "rId4" }),
    ]);
    const result = parseSldIdLst(sldIdLst);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(256);
    expect(result[1].id).toBe(257);
    expect(result[2].id).toBe(258);
  });

  it("slide IDs must be >= 256 (ECMA-376 requirement)", () => {
    const sldIdLst = el("p:sldIdLst", {}, [el("p:sldId", { id: "256", "r:id": "rId2" })]);
    const result = parseSldIdLst(sldIdLst);
    // This is a validation rule, parser should still parse it
    expect(result[0].id).toBeGreaterThanOrEqual(256);
  });
});

// =============================================================================
// p:sldMasterIdLst - Section 19.2.1.35
// =============================================================================

describe("parseSldMasterIdLst - ECMA-376 Section 19.2.1.35 compliance", () => {
  it("parses empty slide master ID list", () => {
    const sldMasterIdLst = el("p:sldMasterIdLst", {}, []);
    const result = parseSldMasterIdLst(sldMasterIdLst);
    expect(result).toEqual([]);
  });

  it("parses single slide master ID", () => {
    const sldMasterIdLst = el("p:sldMasterIdLst", {}, [el("p:sldMasterId", { id: "2147483648", "r:id": "rId1" })]);
    const result = parseSldMasterIdLst(sldMasterIdLst);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2147483648);
    expect(result[0].rId).toBe("rId1");
  });

  it("parses multiple slide master IDs", () => {
    const sldMasterIdLst = el("p:sldMasterIdLst", {}, [
      el("p:sldMasterId", { id: "2147483648", "r:id": "rId1" }),
      el("p:sldMasterId", { id: "2147483649", "r:id": "rId5" }),
    ]);
    const result = parseSldMasterIdLst(sldMasterIdLst);
    expect(result).toHaveLength(2);
  });
});

// =============================================================================
// p:notesMasterIdLst - Section 19.2.1.22
// =============================================================================

describe("parseNotesMasterIdLst - ECMA-376 Section 19.2.1.22 compliance", () => {
  it("parses empty notes master ID list", () => {
    const notesMasterIdLst = el("p:notesMasterIdLst", {}, []);
    const result = parseNotesMasterIdLst(notesMasterIdLst);
    expect(result).toEqual([]);
  });

  it("parses notes master ID with relationship ID", () => {
    const notesMasterIdLst = el("p:notesMasterIdLst", {}, [el("p:notesMasterId", { "r:id": "rId6" })]);
    const result = parseNotesMasterIdLst(notesMasterIdLst);
    expect(result).toHaveLength(1);
    expect(result[0].rId).toBe("rId6");
  });
});

// =============================================================================
// p:handoutMasterIdLst - Section 19.2.1.12
// =============================================================================

describe("parseHandoutMasterIdLst - ECMA-376 Section 19.2.1.12 compliance", () => {
  it("parses empty handout master ID list", () => {
    const handoutMasterIdLst = el("p:handoutMasterIdLst", {}, []);
    const result = parseHandoutMasterIdLst(handoutMasterIdLst);
    expect(result).toEqual([]);
  });

  it("parses handout master ID with relationship ID", () => {
    const handoutMasterIdLst = el("p:handoutMasterIdLst", {}, [el("p:handoutMasterId", { "r:id": "rId7" })]);
    const result = parseHandoutMasterIdLst(handoutMasterIdLst);
    expect(result).toHaveLength(1);
    expect(result[0].rId).toBe("rId7");
  });
});
