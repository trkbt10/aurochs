/**
 * @file Reducer exports
 */

export { vbaEditorReducer, createInitialState } from "./reducer";
export { HANDLERS } from "./handlers";
export {
  createModule,
  createStandardModule,
  createClassModule,
  createFormModule,
  generateUniqueModuleName,
  getModuleNamePrefix,
} from "./module-factory";
