/**
 * @file Local ESLint plugin: custom rules for this repository.
 */
import ternaryLength from "./rules/ternary-length.js";
import noAndAsTernary from "./rules/no-and-as-ternary.js";
import preferNodeProtocol from "./rules/prefer-node-protocol.js";
import noEmptyJsdoc from "./rules/no-empty-jsdoc.js";
import noAsOutsideGuard from "./rules/no-as-outside-guard.js";
import noNestedTry from "./rules/no-nested-try.js";
import noIifeInAnonymous from "./rules/no-iife-in-anonymous.js";
import noDeepReexport from "./rules/no-deep-reexport.js";
import noOxenUiImportInOxen from "./rules/no-oxen-ui-import-in-oxen.js";
import noOxenOfficeImportInOxen from "./rules/no-oxen-office-import-in-oxen.js";
import noOxenBuilderImportInOxenOffice from "./rules/no-oxen-builder-import-in-oxen-office.js";
import noCrossPackageReexport from "./rules/no-cross-package-reexport.js";
import noExportStar from "./rules/no-export-star.js";
import maxParams from "./rules/max-params.js";
import noBareRendererImport from "./rules/no-bare-renderer-import.js";

export default {
  rules: {
    "ternary-length": ternaryLength,
    //  "no-and-as-ternary": noAndAsTernary,
    "prefer-node-protocol": preferNodeProtocol,
    "no-empty-jsdoc": noEmptyJsdoc,
    "no-as-outside-guard": noAsOutsideGuard,
    "no-nested-try": noNestedTry,
    "no-iife-in-anonymous": noIifeInAnonymous,
    "no-deep-reexport": noDeepReexport,
    "no-oxen-ui-import-in-oxen": noOxenUiImportInOxen,
    "no-oxen-office-import-in-oxen": noOxenOfficeImportInOxen,
    "no-oxen-builder-import-in-oxen-office": noOxenBuilderImportInOxenOffice,
    "no-cross-package-reexport": noCrossPackageReexport,
    "no-export-star": noExportStar,
    "max-params": maxParams,
    "no-bare-renderer-import": noBareRendererImport,
  },
};
