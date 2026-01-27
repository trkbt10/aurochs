/**
 * @file OleObjectEditor component tests
 *
 * Tests the OleObjectEditor handles OLE object references correctly.
 */

import type { OleReference, OleObjectFollowColorScheme } from "@oxen/pptx/domain/shape";
import { createDefaultOleReference } from "./OleObjectEditor";

describe("OleObjectEditor: OLE reference handling", () => {
  describe("createDefaultOleReference", () => {
    it("creates valid default OLE reference", () => {
      const oleRef = createDefaultOleReference();

      expect(oleRef).toBeDefined();
      expect(oleRef.showAsIcon).toBe(false);
    });
  });

  describe("OleReference structure", () => {
    it("handles OLE reference with progId", () => {
      const oleRef: OleReference = {
        progId: "Excel.Sheet.12",
        showAsIcon: false,
      };

      expect(oleRef.progId).toBe("Excel.Sheet.12");
    });

    it("handles OLE reference with name", () => {
      const oleRef: OleReference = {
        name: "Embedded Spreadsheet",
        showAsIcon: false,
      };

      expect(oleRef.name).toBe("Embedded Spreadsheet");
    });

    it("handles OLE reference with showAsIcon", () => {
      const oleRef: OleReference = {
        showAsIcon: true,
      };

      expect(oleRef.showAsIcon).toBe(true);
    });

    it("handles OLE reference with resourceId", () => {
      const oleRef: OleReference = {
        resourceId: "rId1",
        showAsIcon: false,
      };

      expect(oleRef.resourceId).toBe("rId1");
    });

    it("handles OLE reference with dimensions", () => {
      const oleRef: OleReference = {
        imgW: 914400,
        imgH: 914400,
        showAsIcon: false,
      };

      expect(oleRef.imgW).toBe(914400);
      expect(oleRef.imgH).toBe(914400);
    });

    it("handles followColorScheme values", () => {
      const colorSchemes: OleObjectFollowColorScheme[] = [
        "full",
        "none",
        "textAndBackground",
      ];

      for (const scheme of colorSchemes) {
        const oleRef: OleReference = {
          followColorScheme: scheme,
          showAsIcon: false,
        };
        expect(oleRef.followColorScheme).toBe(scheme);
      }
    });

    // Note: previewImageUrl is now stored in ResourceStore, not on OleReference

    it("handles complete OLE reference", () => {
      const oleRef: OleReference = {
        progId: "Excel.Sheet.12",
        name: "Budget Spreadsheet",
        resourceId: "rId1",
        imgW: 914400,
        imgH: 609600,
        showAsIcon: false,
        followColorScheme: "full",
      };

      expect(oleRef.progId).toBe("Excel.Sheet.12");
      expect(oleRef.name).toBe("Budget Spreadsheet");
      expect(oleRef.resourceId).toBe("rId1");
      expect(oleRef.imgW).toBe(914400);
      expect(oleRef.imgH).toBe(609600);
      expect(oleRef.showAsIcon).toBe(false);
      expect(oleRef.followColorScheme).toBe("full");
    });
  });
});
