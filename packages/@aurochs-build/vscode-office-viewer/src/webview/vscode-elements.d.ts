/**
 * @file JSX intrinsic element declarations for @vscode-elements/elements.
 *
 * React 19 uses React.JSX namespace for custom element types.
 */

import type {
  VscodeTextfield,
  VscodeTree,
  VscodeTreeItem,
  VscodeCollapsible,
  VscodeIcon,
  VscodeBadge,
  VscodeScrollable,
  VscodeDivider,
  VscodeButton,
  VscodeSingleSelect,
  VscodeOption,
  VscodeLabel,
} from "@vscode-elements/elements";

type WC<E, A = object> = React.DetailedHTMLProps<React.HTMLAttributes<E>, E> & A;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "vscode-textfield": WC<
        VscodeTextfield,
        {
          value?: string;
          placeholder?: string;
          type?: string;
          disabled?: boolean;
          readonly?: boolean;
          required?: boolean;
          autofocus?: boolean;
        }
      >;
      "vscode-tree": WC<VscodeTree, { indent?: number; "indent-guides"?: string }>;
      "vscode-tree-item": WC<
        VscodeTreeItem,
        { label?: string; branch?: boolean; open?: boolean; selected?: boolean; active?: boolean }
      >;
      "vscode-collapsible": WC<VscodeCollapsible, { heading?: string; description?: string; open?: boolean }>;
      "vscode-icon": WC<VscodeIcon, { name?: string; size?: number; spin?: boolean; "spin-duration"?: number }>;
      "vscode-badge": WC<VscodeBadge, { variant?: string }>;
      "vscode-scrollable": WC<VscodeScrollable, { shadow?: boolean }>;
      "vscode-divider": WC<VscodeDivider, { role?: string }>;
      "vscode-button": WC<
        VscodeButton,
        {
          disabled?: boolean;
          secondary?: boolean;
          icon?: string;
          "icon-only"?: boolean;
          "icon-after"?: string;
          "icon-spin"?: boolean;
          "icon-after-spin"?: boolean;
          block?: boolean;
          type?: "submit" | "reset" | "button";
          name?: string;
          value?: string;
        }
      >;
      "vscode-single-select": WC<VscodeSingleSelect, { value?: string }>;
      "vscode-option": WC<VscodeOption, { value?: string; selected?: boolean; disabled?: boolean }>;
      "vscode-label": WC<VscodeLabel>;
    }
  }
}
