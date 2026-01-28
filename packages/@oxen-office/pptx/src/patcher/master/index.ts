export type { BulletElementName } from "./default-text-style-patcher";
export {
  patchTextStyleLevelByNumber,
  patchTextStyleLevelElement,
  patchTextStyleLevelsElement,
} from "./default-text-style-patcher";

export type { PlaceholderChange } from "./layout-patcher";
export { patchLayoutPlaceholders, patchLayoutShapes } from "./layout-patcher";

export { patchBodyStyle, patchDefaultTextStyle, patchMasterShapes, patchTitleStyle } from "./master-patcher";
