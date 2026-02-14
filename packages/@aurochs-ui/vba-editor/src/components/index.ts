/**
 * @file Component exports
 */

export { VbaEditor, type VbaEditorProps } from "./VbaEditor";
export { VbaCodeEditor, type VbaCodeEditorProps } from "./code-editor";
export { VbaModuleList, type VbaModuleListProps } from "./module-list";
export { VbaProcedureDropdown, type VbaProcedureDropdownProps } from "./procedure-dropdown";
export { VbaEditorToolbar, type VbaEditorToolbarProps } from "./toolbar";
export { VbaPropertiesPanel, type VbaPropertiesPanelProps } from "./properties-panel";

// Re-export syntax highlighting utilities
export {
  tokenizeLine,
  getTokenColor,
  type Token,
  type TokenType,
} from "./code-editor";
