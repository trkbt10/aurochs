/**
 * @file Spreadsheet fill handle (autofill) entrypoint
 *
 * Re-exports the XLSX-editor autofill implementation that is used by the reducer on `COMMIT_FILL_DRAG`.
 */

export { applyAutofillToWorksheet } from "./autofill/apply-autofill-to-worksheet";
