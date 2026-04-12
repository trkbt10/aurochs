/**
 * @file Toolbar container component.
 */

export type ToolbarProps = {
  readonly children: React.ReactNode;
};

export function Toolbar({ children }: ToolbarProps): React.JSX.Element {
  return <div className="toolbar">{children}</div>;
}

export function ToolbarSpacer(): React.JSX.Element {
  return <div className="spacer" />;
}

export function ToolbarInfo({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return <span className="info">{children}</span>;
}
